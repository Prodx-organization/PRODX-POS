import crypto from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { RequestPrincipal } from '../http/types';
import { checkPasswordCompromise, type PasswordCompromiseCheck } from './password-compromise';

export type AuthenticatedSession = RequestPrincipal & { sessionId: string };
export type CredentialRecord = {
  userId: string; organizationId: string; username: string;
  status: 'active' | 'disabled'; credentialType: 'password'; secretHash: string;
  failedAttempts: number; lockedUntil: Date | null;
};
export type SessionRecord = {
  id: string; organizationId: string; userId: string; deviceId: string;
  tokenHash: string; expiresAt: Date; revokedAt: Date | null; userStatus: 'active' | 'disabled';
};
export type DeviceRecord = { id: string; organizationId: string; storeId: string; status: 'active' | 'disabled'; };
export type AuthenticationRepository = {
  findCredentialByUsername: (username: string, deviceId: string) => Promise<CredentialRecord | null>;
  recordFailedAttempt: (userId: string, organizationId: string) => Promise<void>;
  resetFailedAttempts: (userId: string, organizationId: string) => Promise<void>;
  createSession: (input: { id: string; organizationId: string; userId: string; deviceId: string; tokenHash: string; expiresAt: Date }) => Promise<void>;
  findSessionByTokenHash: (tokenHash: string) => Promise<SessionRecord | null>;
  findDevice: (deviceId: string) => Promise<DeviceRecord | null>;
  revokeSession: (sessionId: string, tokenHash: string, at: Date) => Promise<void>;
  touchSession: (sessionId: string, tokenHash: string, at: Date) => Promise<void>;
};
export type AuthenticateCredentialsInput = { username: string; password: string; deviceId: string };
export type AuthenticateSupabaseTokenInput = { token: string; deviceId: string };
export type SessionIssuer = {
  authenticateCredentials: (input: AuthenticateCredentialsInput) => Promise<{ token: string; sessionId: string; expiresAt: Date } | null>;
  authenticateSupabaseToken: (input: AuthenticateSupabaseTokenInput) => Promise<{ token: string; sessionId: string; expiresAt: Date } | null>;
  authenticateBearer: (token: string) => Promise<AuthenticatedSession | null>;
  revokeBearer: (token: string) => Promise<boolean>;
};

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export const hashSessionToken = (token: string): string => crypto.createHash('sha256').update(token, 'utf8').digest('hex');
const newBearerToken = (): string => crypto.randomBytes(32).toString('base64url');

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const supabaseJwksUrl = process.env.SUPABASE_JWKS_URL?.trim()
  || (supabaseUrl ? supabaseUrl + '/auth/v1/.well-known/jwks.json' : null);
const supabaseJwks = supabaseJwksUrl ? createRemoteJWKSet(new URL(supabaseJwksUrl)) : null;

const verifySupabaseToken = async (token: string) => {
  if (!supabaseJwks || !supabaseUrl || !token) return null;
  try {
    const { payload } = await jwtVerify(token, supabaseJwks, {
      issuer: supabaseUrl + '/auth/v1',
      audience: 'authenticated',
    });
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string' || typeof payload.exp !== 'number') return null;
    return { userId: payload.sub, email: payload.email, expiresAt: new Date(payload.exp * 1000) };
  } catch {
    return null;
  }
};

export const createSessionIssuer = (
  repository: AuthenticationRepository,
  verifySecret: (secret: string, encodedHash: string) => Promise<boolean>,
  now: () => Date = () => new Date(),
  checkCompromisedPassword: (password: string) => Promise<PasswordCompromiseCheck> = checkPasswordCompromise,
): SessionIssuer => ({
  authenticateCredentials: async ({ username, password, deviceId }) => {
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !password || !deviceId) return null;
    // Resolve the device first so the username lookup is scoped to the device's
    // organization. Usernames are only unique per organization.
    const device = await repository.findDevice(deviceId);
    if (!device || device.status !== 'active') return null;
    const credential = await repository.findCredentialByUsername(normalizedUsername, device.id);
    if (!credential || credential.status !== 'active' || credential.credentialType !== 'password') return null;
    if (device.organizationId !== credential.organizationId) return null;
    const current = now();
    if (credential.lockedUntil && credential.lockedUntil > current) return null;
    // Never trust a client-controlled marker as proof of WebAuthn verification.
    // WebAuthn must be verified by a server-owned challenge/credential flow before it can issue a session.
    if (password.startsWith('WEBAUTHN_VERIFIED:')) {
      await repository.recordFailedAttempt(credential.userId, credential.organizationId);
      return null;
    }

    let compromise: PasswordCompromiseCheck;
    try {
      compromise = await checkCompromisedPassword(password);
    } catch {
      // Do not reveal whether an account exists when the external screening service is unavailable.
      // Fail closed for password authentication: compromised-password screening is a production control.
      return null;
    }
    if (compromise.compromised) {
      await repository.recordFailedAttempt(credential.userId);
      return null;
    }
    if (!(await verifySecret(password, credential.secretHash))) {
      // The repository owns the atomic threshold decision. Never derive the lockout timestamp from a credential snapshot: concurrent failures may observe the same failedAttempts value.
      await repository.recordFailedAttempt(credential.userId);
      return null;
    }
    await repository.resetFailedAttempts(credential.userId, credential.organizationId);
    const token = newBearerToken();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(current.getTime() + SESSION_TTL_MS);
    await repository.createSession({ id: sessionId, organizationId: credential.organizationId, userId: credential.userId, deviceId: device.id, tokenHash: hashSessionToken(token), expiresAt });
    return { token, sessionId, expiresAt };
  },
  authenticateSupabaseToken: async ({ token: supabaseToken, deviceId }) => {
    const verified = await verifySupabaseToken(supabaseToken);
    if (!verified) return null;
    const device = await repository.findDevice(deviceId);
    if (!device || device.status !== 'active') return null;
    const credential = await repository.findCredentialByUsername(verified.email, device.id);
    if (!credential || credential.status !== 'active') return null;
    const nowValue = now();
    if (verified.expiresAt <= nowValue) return null;
    const localToken = newBearerToken();
    const sessionId = crypto.randomUUID();
    const maxExpiry = new Date(nowValue.getTime() + SESSION_TTL_MS);
    const expiresAt = verified.expiresAt < maxExpiry ? verified.expiresAt : maxExpiry;
    await repository.createSession({
      id: sessionId,
      organizationId: credential.organizationId,
      userId: credential.userId,
      deviceId: device.id,
      tokenHash: hashSessionToken(localToken),
      expiresAt,
    });
    return { token: localToken, sessionId, expiresAt };
  },
  authenticateBearer: async (token) => {
    if (!token) return null;
    const session = await repository.findSessionByTokenHash(hashSessionToken(token));
    if (!session || session.revokedAt || session.expiresAt <= now() || session.userStatus !== 'active') return null;
    const device = await repository.findDevice(session.deviceId);
    if (!device || device.status !== 'active' || device.organizationId !== session.organizationId) return null;
    await repository.touchSession(session.id, hashSessionToken(token), now());
    return { sessionId: session.id, userId: session.userId, organizationId: session.organizationId, storeId: device.storeId };
  },
  revokeBearer: async (token) => {
    if (!token) return false;
    const session = await repository.findSessionByTokenHash(hashSessionToken(token));
    if (!session || session.revokedAt) return false;
    await repository.revokeSession(session.id, hashSessionToken(token), now());
    return true;
  },
});
