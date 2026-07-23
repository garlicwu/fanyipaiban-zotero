import { CREATE_TIMEOUT_MS, REQUEST_TIMEOUT_MS } from "../constants";
import type {
  ApiEnvelope,
  ApiErrorPayload,
  CreditsBalance,
  OpenApiTask,
  RequestProgress,
} from "../types/api";
import { normalizeBaseURL } from "../utils/files";

interface RequestOptions {
  headers?: Record<string, string>;
  body?: XMLHttpRequestBodyInit | null;
  timeoutMs?: number;
  onUploadProgress?: (progress: RequestProgress) => void;
}

interface RuntimeGlobalProvider {
  getGlobal(name: string): unknown;
}

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details: ApiErrorPayload = {},
    public readonly ambiguous = false,
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  get requiredCredits(): number {
    return numberDetail(this.details.required_token);
  }

  get availableCredits(): number {
    return numberDetail(this.details.available_token);
  }

  get shortageCredits(): number {
    return numberDetail(this.details.shortage_token);
  }
}

export class FanyiPaibanApiClient {
  constructor(private readonly getBaseURL: () => string) {}

  getBalance(apiKey: string): Promise<CreditsBalance> {
    return this.requestJson<CreditsBalance>("GET", "/balance", {
      headers: authorizationHeaders(apiKey),
    });
  }

  getTask(apiKey: string, taskId: string): Promise<OpenApiTask> {
    return this.requestJson<OpenApiTask>("GET", `/tasks/${encodeURIComponent(taskId)}`, {
      headers: authorizationHeaders(apiKey),
    });
  }

  async createPdfTask(params: {
    apiKey: string;
    idempotencyKey: string;
    filePath: string;
    fileName: string;
    targetLanguage: string;
    onUploadProgress?: (progress: RequestProgress) => void;
  }): Promise<OpenApiTask> {
    const formData = await buildPdfTaskFormData(params);

    return this.requestJson<OpenApiTask>("POST", "/pdf/tasks", {
      headers: {
        ...authorizationHeaders(params.apiKey),
        "Idempotency-Key": params.idempotencyKey,
        Accept: "application/json",
      },
      body: formData,
      timeoutMs: CREATE_TIMEOUT_MS,
      onUploadProgress: params.onUploadProgress,
    });
  }

  private requestJson<T>(method: string, path: string, options: RequestOptions): Promise<T> {
    const url = `${normalizeBaseURL(this.getBaseURL())}${path}`;
    return new Promise<T>((resolve, reject) => {
      const RuntimeXMLHttpRequest = resolveRuntimeGlobal<typeof XMLHttpRequest>("XMLHttpRequest");
      const xhr = new RuntimeXMLHttpRequest();
      xhr.open(method, url, true);
      xhr.responseType = "text";
      xhr.timeout = options.timeoutMs ?? REQUEST_TIMEOUT_MS;

      for (const [name, value] of Object.entries(options.headers || {})) {
        xhr.setRequestHeader(name, value);
      }

      if (options.onUploadProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          const progressEvent = event as ProgressEvent;
          options.onUploadProgress?.({
            loaded: Math.max(0, progressEvent.loaded || 0),
            total: Math.max(0, progressEvent.total || 0),
          });
        };
      }

      xhr.onload = () => {
        try {
          resolve(parseEnvelopeText<T>(xhr.responseText || "", xhr.status));
        } catch (error) {
          reject(error);
        }
      };
      xhr.onerror = () => {
        reject(
          new ApiClientError("NETWORK_ERROR", `Network error while requesting ${url}`, 0, {}, true),
        );
      };
      xhr.ontimeout = () => {
        reject(
          new ApiClientError(
            "REQUEST_TIMEOUT",
            `Request timed out while requesting ${url}`,
            0,
            {},
            true,
          ),
        );
      };
      xhr.onabort = () => {
        reject(
          new ApiClientError(
            "REQUEST_ABORTED",
            `Request was aborted while requesting ${url}`,
            0,
            {},
            true,
          ),
        );
      };

      xhr.send(options.body ?? null);
    });
  }
}

export async function buildPdfTaskFormData(params: {
  filePath: string;
  fileName: string;
  targetLanguage: string;
}): Promise<FormData> {
  const RuntimeFile = resolveRuntimeGlobal<typeof File>("File");
  const RuntimeFormData = resolveRuntimeGlobal<typeof FormData>("FormData");
  const file = await RuntimeFile.createFromFileName(params.filePath, {
    type: "application/pdf",
  });
  const formData = new RuntimeFormData();
  formData.append("file", file, params.fileName);
  formData.append("source_lang", "auto");
  formData.append("target_lang", params.targetLanguage);
  formData.append("parse_engine", "MINERU");
  return formData;
}

export function resolveRuntimeGlobal<T>(name: string, provider?: RuntimeGlobalProvider): T {
  const runtimeProvider = provider ?? (typeof ztoolkit === "undefined" ? undefined : ztoolkit);
  const value =
    runtimeProvider?.getGlobal(name) ?? (globalThis as unknown as Record<string, unknown>)[name];

  if (typeof value === "undefined" || value === null) {
    throw new ApiClientError(
      "UNSUPPORTED_RUNTIME",
      `${name} is unavailable in the current Zotero runtime`,
      0,
    );
  }
  return value as T;
}

export function parseEnvelopeText<T>(responseText: string, status: number): T {
  let envelope: ApiEnvelope<T> | undefined;
  try {
    envelope = JSON.parse(responseText) as ApiEnvelope<T>;
  } catch {
    throw new ApiClientError(
      "INVALID_RESPONSE",
      `The API returned an invalid response (HTTP ${status || 0})`,
      status,
    );
  }

  if (status < 200 || status >= 300 || !envelope.success) {
    throw buildApiError(status, envelope.error || {}, responseText);
  }
  if (typeof envelope.data === "undefined") {
    throw new ApiClientError(
      "MISSING_RESPONSE_DATA",
      "The API response did not include data",
      status,
    );
  }
  return envelope.data;
}

export function buildApiError(
  status: number,
  payload: ApiErrorPayload,
  rawText = "",
): ApiClientError {
  const code = String(payload.code || `HTTP_${status || 0}`);
  const message = String(
    payload.message || rawText.trim() || `API request failed (HTTP ${status})`,
  );
  return new ApiClientError(code, message, status, payload, false);
}

export function parseApiErrorText(status: number, responseText: string): ApiClientError {
  try {
    const envelope = JSON.parse(responseText) as ApiEnvelope<unknown>;
    return buildApiError(status, envelope.error || {}, responseText);
  } catch {
    return buildApiError(status, {}, responseText);
  }
}

function authorizationHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey.trim()}`,
    Accept: "application/json",
  };
}

function numberDetail(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}
