export const PRODUCTION_API_BASE_URL = "https://www.fanyipaiban.com/translate/openapi/v1";

export const DEVELOPER_DOCS_URL = "https://www.fanyipaiban.com/developer-api/";
export const API_KEY_MANAGEMENT_URL =
  "https://www.fanyipaiban.com/poly/developer-api?view=keys&source=zotero";
export const RECHARGE_URL =
  "https://www.fanyipaiban.com/poly/developer-api?recharge=1&source=zotero";
export const PRIVACY_URL = "https://fanyipaiban.com/privacy-policy/";
export const TERMS_URL = "https://fanyipaiban.com/terms-of-service/";
export const REFUND_URL = "https://fanyipaiban.com/refund-policy/";

export const MAX_PDF_BYTES = 300 * 1024 * 1024;
export const CREATE_TIMEOUT_MS = 30 * 60 * 1000;
export const REQUEST_TIMEOUT_MS = 30 * 1000;
export const DOWNLOAD_TIMEOUT_MS = 30 * 60 * 1000;
export const POLL_INTERVAL_MS = 3 * 1000;
export const POLL_BACKOFF_MAX_MS = 15 * 1000;
export const RECHARGE_POLL_INTERVAL_MS = 5 * 1000;
export const RECHARGE_WAIT_TIMEOUT_MS = 2 * 60 * 1000;

export const CREDENTIAL_ORIGIN = "https://www.fanyipaiban.com";
export const CREDENTIAL_REALM = "FanyiPaiban Zotero API Key";
export const CREDENTIAL_USERNAME = "fanyipaiban-zotero";

export interface LanguageOption {
  code: string;
  localeKey: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "cn", localeKey: "language-cn" },
  { code: "en", localeKey: "language-en" },
  { code: "ja", localeKey: "language-ja" },
  { code: "ko", localeKey: "language-ko" },
  { code: "de", localeKey: "language-de" },
  { code: "fr", localeKey: "language-fr" },
  { code: "es", localeKey: "language-es" },
  { code: "it", localeKey: "language-it" },
  { code: "pt", localeKey: "language-pt" },
  { code: "ru", localeKey: "language-ru" },
  { code: "nl", localeKey: "language-nl" },
  { code: "pl", localeKey: "language-pl" },
  { code: "ar", localeKey: "language-ar" },
  { code: "th", localeKey: "language-th" },
  { code: "vi", localeKey: "language-vi" },
  { code: "id", localeKey: "language-id" },
  { code: "tr", localeKey: "language-tr" },
  { code: "cs", localeKey: "language-cs" },
  { code: "hu", localeKey: "language-hu" },
  { code: "sv", localeKey: "language-sv" },
  { code: "no", localeKey: "language-no" },
  { code: "da", localeKey: "language-da" },
  { code: "fi", localeKey: "language-fi" },
  { code: "el", localeKey: "language-el" },
  { code: "he", localeKey: "language-he" },
  { code: "ro", localeKey: "language-ro" },
];
