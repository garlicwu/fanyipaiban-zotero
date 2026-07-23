import type { PersistedTranslationJob } from "../types/job";
import { getPref, setPref } from "../utils/prefs";

const MAX_JOB_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export class JobStore {
  getAll(): PersistedTranslationJob[] {
    const raw = getPref("pendingJobs");
    if (typeof raw !== "string" || !raw.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(isPersistedJob).filter((job) => {
        const updated = Date.parse(job.updatedAt);
        return Number.isFinite(updated) && Date.now() - updated <= MAX_JOB_AGE_MS;
      });
    } catch (error) {
      Zotero.logError(error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  get(localId: string): PersistedTranslationJob | undefined {
    return this.getAll().find((job) => job.localId === localId);
  }

  findForAttachment(attachmentItemId: number): PersistedTranslationJob | undefined {
    return this.getAll().find(
      (job) => job.attachmentItemId === attachmentItemId && job.phase !== "completed",
    );
  }

  upsert(job: PersistedTranslationJob): void {
    const jobs = this.getAll().filter((item) => item.localId !== job.localId);
    jobs.push({ ...job, updatedAt: new Date().toISOString() });
    setPref("pendingJobs", JSON.stringify(jobs));
  }

  remove(localId: string): void {
    const jobs = this.getAll().filter((job) => job.localId !== localId);
    setPref("pendingJobs", JSON.stringify(jobs));
  }
}

function isPersistedJob(value: unknown): value is PersistedTranslationJob {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PersistedTranslationJob>;
  return (
    typeof candidate.localId === "string" &&
    typeof candidate.attachmentItemId === "number" &&
    typeof candidate.libraryId === "number" &&
    typeof candidate.originalPath === "string" &&
    typeof candidate.originalFileName === "string" &&
    typeof candidate.targetLanguage === "string" &&
    typeof candidate.idempotencyKey === "string" &&
    typeof candidate.phase === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    !!candidate.outputs &&
    !!candidate.imported
  );
}
