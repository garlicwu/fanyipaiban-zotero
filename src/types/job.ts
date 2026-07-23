import type { ResultKind } from "./api";

export type JobPhase =
  | "submitting"
  | "submission_uncertain"
  | "waiting_recharge"
  | "polling"
  | "downloading"
  | "completed";

export interface JobOutputSettings {
  translated: true;
  comparison: boolean;
  markdown: boolean;
}

export interface PersistedTranslationJob {
  localId: string;
  taskId?: string;
  attachmentItemId: number;
  parentItemId?: number;
  libraryId: number;
  originalPath: string;
  originalFileName: string;
  targetLanguage: string;
  idempotencyKey: string;
  phase: JobPhase;
  outputs: JobOutputSettings;
  imported: Partial<Record<ResultKind, number>>;
  requiredCredits?: number;
  availableCredits?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedPdfAttachment {
  attachment: Zotero.Item;
  attachmentItemId: number;
  parentItemId?: number;
  libraryId: number;
  path: string;
  fileName: string;
  fileSize: number;
}
