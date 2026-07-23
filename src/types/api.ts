export interface ApiEnvelope<T> {
  success: boolean;
  requestId?: string;
  data?: T;
  error?: ApiErrorPayload;
}

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  required_token?: number;
  available_token?: number;
  shortage_token?: number;
  [key: string]: unknown;
}

export interface CreditsBalance {
  availableToken: number;
  frozenToken: number;
  usedTokenTotal: number;
  rechargeTokenTotal: number;
}

export type TaskStatus = "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED";

export interface OpenApiTask {
  id: string;
  type: string;
  toolType?: string;
  billingUnit?: string;
  fileName?: string;
  sourceLang?: string;
  targetLang?: string;
  status: TaskStatus;
  progress?: number;
  stage?: string;
  message?: string;
  errorMessage?: string;
  billablePageCount?: number;
  pageTokenPrice?: number;
  estimatedToken?: number;
  chargedToken?: number;
  resultFileName?: string;
  downloadPath?: string;
  markdownDownloadPath?: string;
  comparisonDownloadPath?: string;
  createTime?: string;
  finishTime?: string;
}

export type ResultKind = "translated" | "comparison" | "markdown";

export interface RequestProgress {
  loaded: number;
  total: number;
}
