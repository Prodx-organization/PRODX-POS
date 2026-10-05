import crypto from 'node:crypto';
import type { SqlExecutor } from '../auth/postgres-repository';

export type AIRateLimitPolicy = {
  readonly requestsPerMinute: number;
  readonly inputTokensPerDay: number;
};

export class AIRateLimitExceededError extends Error {
  constructor(readonly code: 'AI_RATE_LIMITED' | 'AI_QUOTA_EXCEEDED', message: string) {
    super(message);
    this.name = 'AIRateLimitExceededError';
  }
}

export const consumeAIRateLimit = async (
  db: SqlExecutor,
  scope: { organizationId: string; storeId: string; userId: string },
  estimatedInputTokens: number,
  policy: AIRateLimitPolicy,
): Promise<void> => {
  const now = new Date();
  const minuteStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const minute = await db.query<{ request_count: number }>(
    `INSERT INTO prodx_ai_rate_limit_buckets
      (organization_id, store_id, user_id, window_start, request_count, input_tokens, updated_at)
     VALUES ($1,$2,$3,$4,1,$5,CURRENT_TIMESTAMP)
     ON CONFLICT (organization_id, store_id, user_id, window_start)
     DO UPDATE SET
       request_count = prodx_ai_rate_limit_buckets.request_count + 1,
       input_tokens = prodx_ai_rate_limit_buckets.input_tokens + EXCLUDED.input_tokens,
       updated_at = CURRENT_TIMESTAMP
     WHERE prodx_ai_rate_limit_buckets.request_count < $6
     RETURNING request_count`,
    [scope.organizationId, scope.storeId, scope.userId, minuteStart, estimatedInputTokens, policy.requestsPerMinute],
  );

  if (minute.rows.length === 0) {
    throw new AIRateLimitExceededError('AI_RATE_LIMITED', 'AI request rate limit exceeded.');
  }

  const day = await db.query<{ input_tokens: string }>(
    `SELECT COALESCE(SUM(input_tokens), 0)::text AS input_tokens
       FROM prodx_ai_rate_limit_buckets
      WHERE organization_id=$1 AND store_id=$2 AND user_id=$3
        AND window_start >= $4
        AND window_start < $5`,
    [scope.organizationId, scope.storeId, scope.userId, dayStart, new Date(dayStart.getTime() + 86_400_000)],
  );

  if (BigInt(day.rows[0]?.input_tokens ?? '0') > BigInt(policy.inputTokensPerDay)) {
    throw new AIRateLimitExceededError('AI_QUOTA_EXCEEDED', 'AI daily input-token quota exceeded.');
  }
};
