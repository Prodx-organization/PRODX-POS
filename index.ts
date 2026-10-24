import dotenv from 'dotenv';
import { generateText } from 'ai';

// Load the local secret without printing or exposing it.
dotenv.config({ path: '.env.local' });

if (!process.env.AI_GATEWAY_API_KEY) {
  throw new Error(
    'Missing AI_GATEWAY_API_KEY. Add it to .env.local locally, then run: bun run ai:example',
  );
}

async function main() {
  const { text } = await generateText({
    model: 'moonshotai/kimi-k3',
    prompt:
      'Invent a new holiday and describe its traditions. Give it a memorable name, explain what people celebrate, and list three distinctive traditions.',
  });

  if (!text.trim()) {
    throw new Error('The model returned an empty response.');
  }

  console.log(text);
}

main().catch((error: unknown) => {
  // Error messages only; never print environment variables or credentials.
  console.error('AI Gateway example failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
