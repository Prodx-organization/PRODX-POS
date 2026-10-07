import { createPostgresAuthenticationRepository, type SqlExecutor } from './postgres-repository';
import { createSessionIssuer, type SessionIssuer } from './session';
import { verifyPassword } from './password';
import { checkPasswordCompromise } from './password-compromise';

/**
 * Application composition boundary for M2 authentication.
 *
 * The concrete PostgreSQL client is owned by the application entrypoint and is
 * adapted to SqlExecutor here. Authentication policy remains independent from
 * the database SDK.
 */
export const createPostgresAuthentication = (db: SqlExecutor): SessionIssuer => {
  const repository = createPostgresAuthenticationRepository(db);
  return createSessionIssuer(repository, verifyPassword, () => new Date(), checkPasswordCompromise);
};
