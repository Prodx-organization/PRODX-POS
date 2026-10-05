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
  if (!Number.isInteger(estimatedInputTokens) || estimatedInputTokens < 0) throw new Error('Estimated AI input tokens must be a non-negative integer.');
  if (!Number.isInteger(policy.requestsPerMinute) || policy.requestsPerMinute < 1) throw new Error('AI requests-per-minute policy must be a positive integer.');
  if (!Number.isInteger(policy.inputTokensPerDay) || policy.inputTokensPerDay < 1) throw new Error('AI input-token daily policy must be a positive integer.');

  const now = new Date();
  const minuteStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const result = await db.query<{ allowed: boolean; reason: string | null }>(
    `WITH scope_lock AS (
       SELECT pg_advisory_xact_lock(hashtextextended($1 || ':' || $2 || ':' || $3, 0))
     ),
     current_buckets AS (
       SELECT
         COALESCE(MAX(input_tokens) FILTER (WHERE window_type = 'day' AND window_start = $4), 0) AS day_tokens,
         COALESCE(MAX(request_count) FILTER (WHERE window_type = 'minute' AND window_start = $5), 0) AS minute_requests
       FROM prodx_ai_rate_limit_buckets
       WHERE organization_id = $1 AND store_id = $2 AND user_id = $3
         AND ((window_type = 'day' AND window_start = $4) OR (window_type = 'minute' AND window_start = $5))
     ),
     eligible AS (
       SELECT 1 FROM scope_lock, current_buckets
       WHERE day_tokens + $6 <= $7 AND minute_requests < $8
     ),
     day_bucket AS (
       INSERT INTO prodx_ai_rate_limit_buckets
         (organization_id, store_id, user_id, window_type, window_start, request_count, input_tokens, updated_at)
       SELECT $1,$2,$3,'day',$4,1,$6,CURRENT_TIMESTAMP FROM eligible
       ON CONFLICT (organization_id, store_id, user_id, window_type, window_start)
       DO UPDATE SET request_count = prodx_ai_rate_limit_buckets.request_count + 1,
                     input_tokens = prodx_ai_rate_limit_buckets.input_tokens + EXCLUDED.input_tokens,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING 1
     ),
     minute_bucket AS (
       INSERT INTO prodx_ai_rate_limit_buckets
         (organization_id, store_id, user_id, window_type, window_start, request_count, input_tokens, updated_at)
       SELECT $1,$2,$3,'minute',$5,1,$6,CURRENT_TIMESTAMP FROM eligible
       ON CONFLICT (organization_id, store_id, user_id, window_type, window_start)
       DO UPDATE SET request_count = prodx_ai_rate_limit_buckets.request_count + 1,
                     input_tokens = prodx_ai_rate_limit_buckets.input_tokens + EXCLUDED.input_tokens,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING 1
     )
     SELECT EXISTS(SELECT 1 FROM day_bucket) AND EXISTS(SELECT 1 FROM minute_bucket) AS allowed,
            CASE WHEN NOT EXISTS(SELECT 1 FROM eligible)
                 THEN CASE WHEN current_buckets.day_tokens + $6 > $7 THEN 'AI_QUOTA_EXCEEDED' ELSE 'AI_RATE_LIMITED' END
                 ELSE NULL END AS reason
     FROM current_buckets`,
    [scope.organizationId, scope.storeId, scope.userId, dayStart, minuteStart, estimatedInputTokens, policy.inputTokensPerDay, policy.requestsPerMinute],
  );

  const row = result.rows[0];
  if (!row?.allowed) throw new AIRateLimitExceededError(
    row?.reason === 'AI_QUOTA_EXCEEDED' ? 'AI_QUOTA_EXCEEDED' : 'AI_RATE_LIMITED',
    row?.reason === 'AI_QUOTA_EXCEEDED' ? 'AI daily input-token quota exceeded.' : 'AI request rate limit exceeded.',
  );
};
