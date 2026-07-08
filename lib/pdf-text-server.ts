import "server-only";

type PdfParseFn = (data: Buffer) => Promise<{ text?: string }>;

/** Load parser without pdf-parse/index.js (it runs debug code that reads a test PDF). */
async function loadPdfParse(): Promise<PdfParseFn> {
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  const fn = (mod as { default?: PdfParseFn }).default ?? (mod as unknown as PdfParseFn);
  if (typeof fn !== "function") {
    throw new Error("PDF parser failed to load.");
  }
  return fn;
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const pdfParse = await loadPdfParse();
  const result = await pdfParse(buffer);
  const text = result.text?.replace(/\s+/g, " ").trim() ?? "";
  if (!text) {
    throw new Error(
      "No text found in this PDF. It may be a scanned image without selectable text."
    );
  }
  return text;
}
