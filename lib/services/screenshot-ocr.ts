/**
 * Client-side OCR for screenshot intake. Loads tesseract.js only when called
 * so the worker bundle is not pulled into unrelated routes.
 */
export async function extractTextFromImage(file: File): Promise<string> {
  if (typeof window === "undefined") {
    return "";
  }
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return typeof text === "string" ? text : "";
  } finally {
    await worker.terminate();
  }
}
