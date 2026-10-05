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
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const result = await db.query<{ allowed: boolean; reason: string | null }>(
    `WITH day_bucket AS (
       INSERT INTO prodx_ai_rate_limit_buckets
         (organization_id, store_id, user_id, window_type, window_start, request_count, input_tokens, updated_at)
       VALUES ($1,$2,$3,'day',$4,1,$5,CURRENT_TIMESTAMP)
       ON CONFLICT (organization_id, store_id, user_id, window_type, window_start)
       DO UPDATE SET
         request_count = prodx_ai_rate_limit_buckets.request_count + 1,
         input_tokens = prodx_ai_rate_limit_buckets.input_tokens + EXCLUDED.input_tokens,
         updated_at = CURRENT_TIMESTAMP
       WHERE prodx_ai_rate_limit_buckets.input_tokens + EXCLUDED.input_tokens <= $6
       RETURNING 1
     ),
     minute_bucket AS (
       INSERT INTO prodx_ai_rate_limit_buckets
         (organization_id, store_id, user_id, window_type, window_start, request_count, input_tokens, updated_at)
       SELECT $1,$2,$3,'minute',$7,1,$5,CURRENT_TIMESTAMP
       FROM day_bucket
       ON CONFLICT (organization_id, store_id, user_id, window_type, window_start)
       DO UPDATE SET
         request_count = prodx_ai_rate_limit_buckets.request_count + 1,
         input_tokens = prodx_ai_rate_limit_buckets.input_tokens + EXCLUDED.input_tokens,
         updated_at = CURRENT_TIMESTAMP
       WHERE prodx_ai_rate_limit_buckets.request_count < $8
       RETURNING 1
     )
     SELECT
       EXISTS(SELECT 1 FROM day_bucket) AND EXISTS(SELECT 1 FROM minute_bucket) AS allowed,
       CASE
         WHEN NOT EXISTS(SELECT 1 FROM day_bucket) THEN 'AI_QUOTA_EXCEEDED'
         WHEN NOT EXISTS(SELECT 1 FROM minute_bucket) THEN 'AI_RATE_LIMITED'
         ELSE NULL
       END AS reason`,
    [scope.organizationId, scope.storeId, scope.userId, dayStart, estimatedInputTokens, policy.inputTokensPerDay, minuteStart, policy.requestsPerMinute],
  );

  const row = result.rows[0];
  if (!row?.allowed) {
    throw new AIRateLimitExceededError(
      row?.reason === 'AI_QUOTA_EXCEEDED' ? 'AI_QUOTA_EXCEEDED' : 'AI_RATE_LIMITED',
      row?.reason === 'AI_QUOTA_EXCEEDED' ? 'AI daily input-token quota exceeded.' : 'AI request rate limit exceeded.',
    );
  }
};
