import "server-only";

/** Read at runtime (bracket access avoids empty build-time inlining on Vercel). */
export function readOpenAIApiKeyFromEnv(): string | undefined {
  const raw = process.env["OPENAI_API_KEY"];
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const PLACEHOLDER_KEY_PATTERN =
  /^sk-(\.\.\.|xxx+|your|proj-\.\.\.)$/i;

export function isPlaceholderOpenAIKey(key: string): boolean {
  if (key.length < 20) return true;
  if (PLACEHOLDER_KEY_PATTERN.test(key)) return true;
  if (/placeholder|example|changeme/i.test(key)) return true;
  return false;
}

export function getOpenAIApiKey(): string {
  const apiKey = readOpenAIApiKeyFromEnv();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local for local dev (then restart npm run dev), or to your host's environment variables for production (e.g. Vercel → Settings → Environment Variables), then redeploy."
    );
  }
  if (isPlaceholderOpenAIKey(apiKey)) {
    throw new Error(
      "OPENAI_API_KEY looks like a placeholder. Create a secret key at https://platform.openai.com/api-keys and set the full value."
    );
  }
  return apiKey;
}
