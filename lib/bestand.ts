import mammoth from "mammoth";

export async function tekstUitPdf(buffer: Buffer): Promise<string> {
  const { extractText } = await import("unpdf");
  const data = new Uint8Array(buffer);
  const { text } = await extractText(data, { mergePages: true });
  const joined = Array.isArray(text) ? text.join("\n") : text || "";
  return joined.replace(/\u0000/g, "").trim();
}

export async function tekstUitDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return (result.value || "").trim();
}

export async function tekstUitUpload(buffer: Buffer, filename: string, mime: string): Promise<string> {
  const naam = filename.toLowerCase();
  if (mime.includes("pdf") || naam.endsWith(".pdf")) {
    return tekstUitPdf(buffer);
  }
  if (
    mime.includes("word") ||
    mime.includes("officedocument") ||
    naam.endsWith(".docx")
  ) {
    return tekstUitDocx(buffer);
  }
  if (naam.endsWith(".txt") || mime.includes("text/plain")) {
    return buffer.toString("utf8");
  }
  throw new Error("Upload een PDF, Word-bestand (.docx) of .txt — geen link.");
}
