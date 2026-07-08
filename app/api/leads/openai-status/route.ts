import { NextResponse } from "next/server";
import {
  isPlaceholderOpenAIKey,
  readOpenAIApiKeyFromEnv,
} from "@/lib/openai-api-key";

/** Debug helper: confirms the server sees OPENAI_API_KEY (never returns the key). */
export async function GET() {
  const key = readOpenAIApiKeyFromEnv();
  if (!key) {
    return NextResponse.json({
      configured: false,
      reason: "OPENAI_API_KEY is missing or empty on the server.",
    });
  }
  if (isPlaceholderOpenAIKey(key)) {
    return NextResponse.json({
      configured: false,
      reason: "OPENAI_API_KEY is set but looks like a placeholder, not a real key.",
    });
  }
  return NextResponse.json({
    configured: true,
    prefix: key.slice(0, 7),
    length: key.length,
  });
}
