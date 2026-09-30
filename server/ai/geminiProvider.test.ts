import assert from 'node:assert/strict';
import test from 'node:test';
import { GeminiProvider } from './geminiProvider';

test('GeminiProvider sends server-side credentials and normalizes Gemini content', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({
      responseId: 'gemini-test-1',
      candidates: [{ content: { parts: [{ text: 'สวัสดีจาก Gemini' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 7, totalTokenCount: 18 },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const provider = new GeminiProvider({ apiKey: 'test-secret', defaultModel: 'gemini-3.8-flash' });
    const result = await provider.chat({
      model: 'gemini-3.8-flash',
      messages: [
        { role: 'system', content: 'You are PRODX AI.' },
        { role: 'user', content: 'Hello' },
      ],
    });

    assert.equal(result.provider, 'gemini');
    assert.equal(result.model, 'gemini-3.8-flash');
    assert.equal((result.choices?.[0] as { message: { content: string } }).message.content, 'สวัสดีจาก Gemini');
    assert.equal(result.usage?.total_tokens, 18);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init?.headers instanceof Headers ? calls[0].init.headers.get('x-goog-api-key') : (calls[0].init?.headers as Record<string, string>)['x-goog-api-key'], 'test-secret');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GeminiProvider rejects models outside the server allowlist', async () => {
  const provider = new GeminiProvider({ apiKey: 'test-secret', defaultModel: 'gemini-3.8-flash', allowedModels: ['gemini-3.8-flash'] });
  await assert.rejects(
    provider.chat({ model: 'unapproved-model', messages: [{ role: 'user', content: 'Hello' }] }),
    /not allowed by server policy/,
  );
});
