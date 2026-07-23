import { LANGUAGE_OPTIONS } from "../constants";
import type { ResultKind } from "../types/api";

export function formatCredits(value: number | null | undefined): string {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat().format(Math.max(0, safeValue));
}

export function normalizeBaseURL(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function sanitizeFileName(value: string): string {
  const withoutControlCharacters = Array.from(value, (character) =>
    character.charCodeAt(0) < 32 ? "_" : character,
  ).join("");
  const sanitized = withoutControlCharacters
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim();
  return sanitized || "document";
}

export function getFileBaseName(fileName: string): string {
  const safeName = sanitizeFileName(fileName);
  const dot = safeName.lastIndexOf(".");
  return dot > 0 ? safeName.slice(0, dot) : safeName;
}

export function ensureExtension(fileName: string, extension: string): string {
  const normalizedExtension = extension.startsWith(".")
    ? extension.toLowerCase()
    : `.${extension.toLowerCase()}`;
  return fileName.toLowerCase().endsWith(normalizedExtension)
    ? fileName
    : `${fileName}${normalizedExtension}`;
}

export function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `zotero-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createLocalJobId(): string {
  return `fp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isSupportedLanguage(code: string): boolean {
  return LANGUAGE_OPTIONS.some((language) => language.code === code);
}

export function buildTempFilePath(fileName: string): string {
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${sanitizeFileName(fileName)}`;
  return PathUtils.join(Zotero.getTempDirectory().path, uniqueName);
}

export function buildResultFileName(
  originalFileName: string,
  targetLanguage: string,
  kind: ResultKind,
): string {
  const base = getFileBaseName(originalFileName);
  if (kind === "comparison") {
    return `${base}_${targetLanguage}_comparison.pdf`;
  }
  if (kind === "markdown") {
    return `${base}_${targetLanguage}_translated.md`;
  }
  return `${base}_${targetLanguage}_translated.pdf`;
}

export function maskApiKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 10) {
    return trimmed ? "********" : "";
  }
  return `${trimmed.slice(0, 8)}${"*".repeat(Math.min(16, trimmed.length - 12))}${trimmed.slice(-4)}`;
}
