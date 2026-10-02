import type { AIChatRequest, AIChatResponse, AIProvider } from './types';

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-3.8-flash';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 20_000;

export interface GeminiProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  allowedModels?: readonly string[];
  timeoutMs?: number;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Gemini AI base URL must use HTTPS.');
  return url.toString().replace(/\/$/, '');
}

function allowedModelSet(config: GeminiProviderConfig): ReadonlySet<string> {
  const configured = config.allowedModels ?? (process.env.GEMINI_ALLOWED_MODELS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  return new Set(configured.length > 0 ? configured : [config.defaultModel ?? process.env.GEMINI_DEFAULT_MODEL ?? DEFAULT_MODEL]);
}

function resolveTimeout(value: number | string | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(120_000, Math.max(1_000, Math.trunc(parsed)));
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly allowedModels: ReadonlySet<string>;
  private readonly timeoutMs: number;

  constructor(config: GeminiProviderConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.GEMINI_API_KEY ?? '';
    this.baseUrl = normalizeBaseUrl(config.baseUrl ?? process.env.GEMINI_BASE_URL ?? DEFAULT_BASE_URL);
    this.defaultModel = config.defaultModel ?? process.env.GEMINI_DEFAULT_MODEL ?? DEFAULT_MODEL;
    this.allowedModels = allowedModelSet({ ...config, defaultModel: this.defaultModel });
    this.timeoutMs = resolveTimeout(config.timeoutMs ?? process.env.GEMINI_TIMEOUT_MS);
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    this.validateRequest(request);
    if (!this.apiKey) throw new Error('Gemini AI is not configured: GEMINI_API_KEY is missing.');

    const model = request.model ?? this.defaultModel;
    if (!this.allowedModels.has(model)) throw new Error(`Gemini model '${model}' is not allowed by server policy.`);

    const systemMessages = request.messages.filter((message) => message.role === 'system');
    const contents = request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));

    if (contents.length === 0) throw new Error('Gemini request must contain user or assistant content.');

    const body = {
      ...(systemMessages.length > 0
        ? { system_instruction: { parts: systemMessages.map((message) => ({ text: message.content })) } }
        : {}),
      contents,
      generationConfig: {
        ...(request.max_tokens === undefined ? {} : { maxOutputTokens: request.max_tokens }),
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Gemini AI request failed (${response.status}).`);

      const raw = (await response.json()) as Record<string, unknown>;
      const candidates = Array.isArray(raw.candidates) ? raw.candidates : [];
      const first = candidates[0] as Record<string, unknown> | undefined;
      const content = first?.content as Record<string, unknown> | undefined;
      const parts = Array.isArray(content?.parts) ? content.parts : [];
      const text = parts
        .filter((part): part is Record<string, unknown> => typeof part === 'object' && part !== null)
        .filter((part) => typeof part.text === 'string')
        .map((part) => part.text as string)
        .join('');

      if (!text.trim()) throw new Error('Gemini AI returned no text content.');

      const usage = raw.usageMetadata as Record<string, unknown> | undefined;
      return {
        id: typeof raw.responseId === 'string' ? raw.responseId : undefined,
        model,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: text },
          finish_reason: typeof first?.finishReason === 'string' ? first.finishReason : 'STOP',
        }],
        usage: usage ? {
          prompt_tokens: typeof usage.promptTokenCount === 'number' ? usage.promptTokenCount : undefined,
          completion_tokens: typeof usage.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : undefined,
          total_tokens: typeof usage.totalTokenCount === 'number' ? usage.totalTokenCount : undefined,
        } : undefined,
        provider: this.name,
        raw,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Gemini AI request timed out after ${this.timeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private validateRequest(request: AIChatRequest): void {
    if (!Array.isArray(request.messages) || request.messages.length === 0) throw new Error('AI request must contain at least one message.');
    if (request.messages.length > MAX_MESSAGES) throw new Error(`AI request exceeds the ${MAX_MESSAGES}-message limit.`);
    for (const message of request.messages) {
      if (!message.content.trim() || message.content.length > MAX_MESSAGE_CHARS) {
        throw new Error('AI message content is empty or exceeds the allowed size.');
      }
    }
    if (request.stream) throw new Error('Gemini provider does not support streaming through this boundary yet.');
    // temperature is accepted by the gateway contract but intentionally not
    // forwarded to Gemini by this provider.
    if (request.max_tokens !== undefined && (!Number.isInteger(request.max_tokens) || request.max_tokens < 1)) {
      throw new Error('AI max_tokens must be a positive integer.');
    }
  }
}
