import {
  LANGUAGE_OPTIONS,
  POLL_BACKOFF_MAX_MS,
  POLL_INTERVAL_MS,
  RECHARGE_POLL_INTERVAL_MS,
  RECHARGE_URL,
  RECHARGE_WAIT_TIMEOUT_MS,
} from "../constants";
import type { CreditsBalance, OpenApiTask, RequestProgress, ResultKind } from "../types/api";
import type { PersistedTranslationJob } from "../types/job";
import {
  buildTempFilePath,
  createIdempotencyKey,
  createLocalJobId,
  formatCredits,
  getFileBaseName,
  isSupportedLanguage,
} from "../utils/files";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import { retryKeyAction } from "../utils/idempotency";
import { ApiClientError, FanyiPaibanApiClient } from "./apiClient";
import { AttachmentService, PdfSelectionError } from "./attachmentService";
import { CredentialStore } from "./credentialStore";
import { DownloadService } from "./downloadService";
import { JobStore } from "./jobStore";
import {
  confirmInsufficientCredits,
  confirmRechargeReady,
  confirmTranslation,
  showAlert,
} from "../ui/prompts";

interface ProgressHandle {
  changeLine(options: { type?: string; text?: string; progress?: number }): ProgressHandle;
  startCloseTimer(ms: number): ProgressHandle;
}

export class TranslationService {
  private busy = false;

  constructor(
    private readonly credentials: CredentialStore,
    private readonly api: FanyiPaibanApiClient,
    private readonly downloads: DownloadService,
    private readonly jobs: JobStore,
    private readonly attachments: AttachmentService,
    private readonly openPreferences: () => void,
  ) {}

  async translateSelected(win: _ZoteroTypes.MainWindow): Promise<void> {
    if (this.busy) {
      showAlert(win, getString("error-busy"));
      return;
    }

    this.busy = true;
    try {
      const resolved = await this.attachments.resolveSelectedPdf(win);
      const apiKey = await this.requireApiKey(win);
      if (!apiKey) {
        return;
      }

      const existing = this.jobs.findForAttachment(resolved.attachmentItemId);
      if (existing) {
        existing.originalPath = resolved.path;
        existing.originalFileName = resolved.fileName;
        existing.parentItemId = resolved.parentItemId;
        existing.libraryId = resolved.libraryId;
        this.jobs.upsert(existing);
        await this.resumeExistingJob(win, existing, apiKey);
        return;
      }

      const progress = this.createProgress(win, getString("progress-validating"), 5);
      const balance = await this.getBalanceOrHandleError(win, apiKey, progress);
      if (!balance) {
        return;
      }

      const targetLanguage = this.getTargetLanguage();
      const targetLanguageLabel = this.getLanguageLabel(targetLanguage);
      if (getPref("confirmBeforeSubmit")) {
        const choice = confirmTranslation(
          win,
          getString("confirm-message", {
            file: resolved.fileName,
            language: targetLanguageLabel,
            available: formatCredits(balance.availableToken),
            frozen: formatCredits(balance.frozenToken),
          }),
        );
        if (choice === "settings") {
          this.openPreferences();
          progress.changeLine({ type: "default", text: getString("menu-settings") });
          progress.startCloseTimer(1500);
          return;
        }
        if (choice !== "translate") {
          progress.startCloseTimer(500);
          return;
        }
      }

      const now = new Date().toISOString();
      const job: PersistedTranslationJob = {
        localId: createLocalJobId(),
        attachmentItemId: resolved.attachmentItemId,
        parentItemId: resolved.parentItemId,
        libraryId: resolved.libraryId,
        originalPath: resolved.path,
        originalFileName: resolved.fileName,
        targetLanguage,
        idempotencyKey: createIdempotencyKey(),
        phase: "submitting",
        outputs: {
          translated: true,
          comparison: Boolean(getPref("downloadComparison")),
          markdown: Boolean(getPref("downloadMarkdown")),
        },
        imported: {},
        createdAt: now,
        updatedAt: now,
      };
      this.jobs.upsert(job);
      await this.submitAndProcess(win, job, apiKey, progress);
    } catch (error) {
      this.handleTopLevelError(win, error);
    } finally {
      this.busy = false;
    }
  }

  async resumeAcceptedJobs(): Promise<void> {
    if (this.busy) {
      return;
    }
    const apiKey = await this.credentials.getApiKey();
    if (!apiKey) {
      return;
    }
    const resumable = this.jobs
      .getAll()
      .filter((job) => Boolean(job.taskId) && job.phase !== "completed");
    if (!resumable.length) {
      return;
    }

    const win = Zotero.getMainWindow() as _ZoteroTypes.MainWindow | null;
    if (!win) {
      return;
    }

    this.busy = true;
    try {
      for (const job of resumable) {
        const progress = this.createProgress(win, getString("progress-resuming"), 10);
        try {
          await this.processAcceptedJob(win, job, apiKey, progress);
        } catch (error) {
          this.handleJobError(win, job, error, progress);
        }
      }
    } finally {
      this.busy = false;
    }
  }

  private async resumeExistingJob(
    win: _ZoteroTypes.MainWindow,
    job: PersistedTranslationJob,
    apiKey: string,
  ): Promise<void> {
    const progress = this.createProgress(win, getString("progress-resuming"), 10);
    if (job.taskId) {
      await this.processAcceptedJob(win, job, apiKey, progress);
      return;
    }

    if (job.phase === "submission_uncertain") {
      const shouldResume = Services.prompt.confirm(
        win as unknown as mozIDOMWindowProxy,
        getString("confirm-title"),
        getString("resume-uncertain"),
      );
      if (!shouldResume) {
        progress.startCloseTimer(500);
        return;
      }
    }

    if (job.phase === "waiting_recharge") {
      const ready = await this.prepareRechargeRetry(win, job, apiKey, progress);
      if (!ready) {
        return;
      }
    }

    await this.submitAndProcess(win, job, apiKey, progress);
  }

  private async submitAndProcess(
    win: _ZoteroTypes.MainWindow,
    job: PersistedTranslationJob,
    apiKey: string,
    progress: ProgressHandle,
  ): Promise<void> {
    while (true) {
      job.phase = "submitting";
      this.jobs.upsert(job);
      try {
        const task = await this.createTaskWithNetworkRetry(job, apiKey, progress);
        job.taskId = task.id;
        job.phase = "polling";
        this.jobs.upsert(job);
        await this.processAcceptedJob(win, job, apiKey, progress, task);
        return;
      } catch (error) {
        if (error instanceof ApiClientError && error.code === "INSUFFICIENT_CREDITS") {
          job.phase = "waiting_recharge";
          job.requiredCredits = error.requiredCredits;
          job.availableCredits = error.availableCredits;
          this.jobs.upsert(job);
          const shouldRetry = await this.handleInsufficientCredits(win, job, apiKey, progress);
          if (shouldRetry) {
            if (retryKeyAction("insufficient_credits") === "replace") {
              job.idempotencyKey = createIdempotencyKey();
            }
            job.phase = "submitting";
            this.jobs.upsert(job);
            continue;
          }
          return;
        }

        if (error instanceof ApiClientError && error.ambiguous) {
          job.phase = "submission_uncertain";
          this.jobs.upsert(job);
          progress.changeLine({
            type: "fail",
            progress: 100,
            text: getString("error-network"),
          });
          progress.startCloseTimer(10000);
          showAlert(win, getString("error-network"));
          return;
        }

        this.handleJobError(win, job, error, progress);
        return;
      }
    }
  }

  private async createTaskWithNetworkRetry(
    job: PersistedTranslationJob,
    apiKey: string,
    progress: ProgressHandle,
  ): Promise<OpenApiTask> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.api.createPdfTask({
          apiKey,
          idempotencyKey: job.idempotencyKey,
          filePath: job.originalPath,
          fileName: job.originalFileName,
          targetLanguage: job.targetLanguage,
          onUploadProgress: (upload) => {
            this.updateUploadProgress(progress, upload);
          },
        });
      } catch (error) {
        lastError = error;
        if (!(error instanceof ApiClientError) || !error.ambiguous || attempt > 0) {
          throw error;
        }
        progress.changeLine({
          progress: 20,
          text: getString("error-network"),
        });
        await Zotero.Promise.delay(1500);
      }
    }
    throw lastError;
  }

  private async processAcceptedJob(
    win: _ZoteroTypes.MainWindow,
    job: PersistedTranslationJob,
    apiKey: string,
    progress: ProgressHandle,
    initialTask?: OpenApiTask,
  ): Promise<void> {
    if (!job.taskId) {
      throw new Error("Accepted job is missing taskId");
    }
    const task = await this.waitForTask(job, apiKey, progress, initialTask);
    if (task.status === "FAILED") {
      this.jobs.remove(job.localId);
      const message = task.errorMessage || task.message || "Unknown task error";
      throw new Error(getString("error-task-failed", { message }));
    }

    job.phase = "downloading";
    this.jobs.upsert(job);
    await this.downloadAndImportResults(win, job, apiKey, progress);
  }

  private async waitForTask(
    job: PersistedTranslationJob,
    apiKey: string,
    progress: ProgressHandle,
    initialTask?: OpenApiTask,
  ): Promise<OpenApiTask> {
    let task = initialTask;
    let networkFailures = 0;
    while (true) {
      if (!task) {
        try {
          task = await this.api.getTask(apiKey, job.taskId!);
          networkFailures = 0;
        } catch (error) {
          if (error instanceof ApiClientError && error.ambiguous) {
            networkFailures += 1;
            const delay = Math.min(
              POLL_BACKOFF_MAX_MS,
              POLL_INTERVAL_MS * Math.max(1, networkFailures),
            );
            progress.changeLine({ text: getString("error-network") });
            if (networkFailures >= 6) {
              job.phase = "polling";
              this.jobs.upsert(job);
              throw error;
            }
            await Zotero.Promise.delay(delay);
            continue;
          }
          throw error;
        }
      }

      this.updateTaskProgress(progress, task);
      if (task.status === "SUCCESS" || task.status === "FAILED") {
        return task;
      }
      await Zotero.Promise.delay(POLL_INTERVAL_MS);
      task = undefined;
    }
  }

  private async downloadAndImportResults(
    win: _ZoteroTypes.MainWindow,
    job: PersistedTranslationJob,
    apiKey: string,
    progress: ProgressHandle,
  ): Promise<void> {
    const kinds: ResultKind[] = ["translated"];
    if (job.outputs.comparison) {
      kinds.push("comparison");
    }
    if (job.outputs.markdown) {
      kinds.push("markdown");
    }

    const missing = kinds.filter((kind) => !job.imported[kind]);
    const errors: string[] = [];
    for (let index = 0; index < missing.length; index += 1) {
      const kind = missing[index];
      if (!kind) {
        continue;
      }
      const descriptor = this.createResultDescriptor(job, kind);
      const tempPath = buildTempFilePath(descriptor.fileName);
      try {
        progress.changeLine({
          progress: 88 + Math.round((index / Math.max(1, missing.length)) * 8),
          text: getString("progress-downloading"),
        });
        await this.downloads.downloadResult({
          apiKey,
          taskId: job.taskId!,
          kind,
          destinationPath: tempPath,
          onProgress: (download) => {
            const ratio = download.total > 0 ? download.loaded / download.total : 0;
            progress.changeLine({
              progress: 88 + Math.round(Math.min(1, ratio) * 6),
              text: getString("progress-downloading"),
            });
          },
        });
        progress.changeLine({
          progress: 96,
          text: getString("progress-importing"),
        });
        const imported = await this.attachments.importResult({
          descriptor,
          downloadedPath: tempPath,
          parentItemId: job.parentItemId,
          libraryId: job.libraryId,
        });
        if (imported.id) {
          job.imported[kind] = imported.id;
          this.jobs.upsert(job);
        }
      } catch (error) {
        Zotero.logError(asError(error));
        errors.push(error instanceof Error ? error.message : `${kind} result failed`);
      } finally {
        try {
          await IOUtils.remove(tempPath, { ignoreAbsent: true });
        } catch (error) {
          Zotero.logError(asError(error));
        }
      }
    }

    if (errors.length) {
      job.phase = "downloading";
      this.jobs.upsert(job);
      const message = errors.join("; ");
      progress.changeLine({
        type: "fail",
        progress: 100,
        text: getString("error-result-partial", { message }),
      });
      progress.startCloseTimer(10000);
      showAlert(win, getString("error-result-partial", { message }));
      return;
    }

    job.phase = "completed";
    this.jobs.upsert(job);
    this.jobs.remove(job.localId);
    progress.changeLine({
      type: "success",
      progress: 100,
      text: getString("progress-complete"),
    });
    progress.startCloseTimer(6000);
  }

  private createResultDescriptor(job: PersistedTranslationJob, kind: ResultKind) {
    const language = this.getLanguageLabel(job.targetLanguage);
    const base = getFileBaseName(job.originalFileName);
    return this.attachments.buildResultDescriptor({
      originalFileName: job.originalFileName,
      targetLanguage: job.targetLanguage,
      targetLanguageLabel: language,
      kind,
      translatedTitle: getString("result-translated-title", { base, language }),
      comparisonTitle: getString("result-comparison-title", { base, language }),
      markdownTitle: getString("result-markdown-title", { base, language }),
    });
  }

  private async prepareRechargeRetry(
    win: _ZoteroTypes.MainWindow,
    job: PersistedTranslationJob,
    apiKey: string,
    progress: ProgressHandle,
  ): Promise<boolean> {
    const balance = await this.getBalanceOrHandleError(win, apiKey, progress);
    if (!balance) {
      return false;
    }
    if (balance.availableToken >= Math.max(1, job.requiredCredits || 0)) {
      if (!confirmRechargeReady(win)) {
        progress.startCloseTimer(500);
        return false;
      }
      if (retryKeyAction("insufficient_credits") === "replace") {
        job.idempotencyKey = createIdempotencyKey();
      }
      job.phase = "submitting";
      this.jobs.upsert(job);
      return true;
    }
    const ready = await this.handleInsufficientCredits(win, job, apiKey, progress);
    if (ready) {
      if (retryKeyAction("insufficient_credits") === "replace") {
        job.idempotencyKey = createIdempotencyKey();
      }
      job.phase = "submitting";
      this.jobs.upsert(job);
    }
    return ready;
  }

  private async handleInsufficientCredits(
    win: _ZoteroTypes.MainWindow,
    job: PersistedTranslationJob,
    apiKey: string,
    progress: ProgressHandle,
  ): Promise<boolean> {
    while (true) {
      const required = Math.max(0, job.requiredCredits || 0);
      const available = Math.max(0, job.availableCredits || 0);
      const shortage = Math.max(0, required - available);
      const choice = confirmInsufficientCredits(
        win,
        getString("insufficient-message", {
          required: formatCredits(required),
          available: formatCredits(available),
          shortage: formatCredits(shortage),
        }),
      );

      if (choice === "cancel") {
        progress.changeLine({
          type: "fail",
          progress: 100,
          text: getString("insufficient-title"),
        });
        progress.startCloseTimer(5000);
        return false;
      }

      if (choice === "recharge") {
        Zotero.launchURL(RECHARGE_URL);
        progress.changeLine({
          progress: 20,
          text: getString("recharge-waiting"),
        });
        const balance = await this.waitForRecharge(apiKey, required);
        if (!balance) {
          progress.changeLine({
            type: "fail",
            progress: 100,
            text: getString("recharge-timeout"),
          });
          progress.startCloseTimer(10000);
          showAlert(win, getString("recharge-timeout"));
          return false;
        }
        job.availableCredits = balance.availableToken;
        this.jobs.upsert(job);
      } else {
        const balance = await this.getBalanceOrHandleError(win, apiKey, progress);
        if (!balance) {
          return false;
        }
        job.availableCredits = balance.availableToken;
        this.jobs.upsert(job);
      }

      if ((job.availableCredits || 0) >= Math.max(1, required)) {
        return confirmRechargeReady(win);
      }
    }
  }

  private async waitForRecharge(
    apiKey: string,
    requiredCredits: number,
  ): Promise<CreditsBalance | undefined> {
    const deadline = Date.now() + RECHARGE_WAIT_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await Zotero.Promise.delay(RECHARGE_POLL_INTERVAL_MS);
      try {
        const balance = await this.api.getBalance(apiKey);
        if (balance.availableToken >= Math.max(1, requiredCredits)) {
          return balance;
        }
      } catch (error) {
        if (!(error instanceof ApiClientError) || !error.ambiguous) {
          throw error;
        }
      }
    }
    return undefined;
  }

  private async requireApiKey(win: _ZoteroTypes.MainWindow): Promise<string | undefined> {
    const apiKey = await this.credentials.getApiKey();
    if (apiKey) {
      return apiKey;
    }
    showAlert(win, getString("error-key-required"));
    this.openPreferences();
    return undefined;
  }

  private async getBalanceOrHandleError(
    win: _ZoteroTypes.MainWindow,
    apiKey: string,
    progress: ProgressHandle,
  ): Promise<CreditsBalance | undefined> {
    try {
      return await this.api.getBalance(apiKey);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        progress.changeLine({
          type: "fail",
          progress: 100,
          text: getString("error-invalid-key"),
        });
        progress.startCloseTimer(8000);
        showAlert(win, getString("error-invalid-key"));
        this.openPreferences();
        return undefined;
      }
      throw error;
    }
  }

  private updateUploadProgress(progress: ProgressHandle, upload: RequestProgress): void {
    const ratio = upload.total > 0 ? upload.loaded / upload.total : 0;
    progress.changeLine({
      progress: 5 + Math.round(Math.min(1, ratio) * 20),
      text: getString("progress-uploading"),
    });
  }

  private updateTaskProgress(progress: ProgressHandle, task: OpenApiTask): void {
    const serverProgress = Math.max(0, Math.min(100, Number(task.progress || 0)));
    progress.changeLine({
      progress: 25 + Math.round(serverProgress * 0.6),
      text:
        task.status === "QUEUED"
          ? getString("progress-queued")
          : task.message || getString("progress-running"),
    });
  }

  private getTargetLanguage(): string {
    const configured = String(getPref("targetLanguage") || "cn");
    return isSupportedLanguage(configured) ? configured : "cn";
  }

  private getLanguageLabel(code: string): string {
    const language = LANGUAGE_OPTIONS.find((item) => item.code === code);
    return language ? getString(language.localeKey) : code;
  }

  private createProgress(
    win: _ZoteroTypes.MainWindow,
    text: string,
    progress: number,
  ): ProgressHandle {
    return new ztoolkit.ProgressWindow(getString("progress-title"), {
      window: win,
      closeOnClick: true,
      closeTime: -1,
    })
      .createLine({ type: "default", text, progress })
      .show() as ProgressHandle;
  }

  private handleTopLevelError(win: _ZoteroTypes.MainWindow, error: unknown) {
    if (error instanceof PdfSelectionError) {
      const key =
        error.code === "MULTIPLE_PDFS"
          ? "error-multiple-pdfs"
          : error.code === "MISSING_FILE"
            ? "error-missing-file"
            : error.code === "FILE_TOO_LARGE"
              ? "error-file-too-large"
              : "error-no-selection";
      showAlert(win, getString(key));
      return;
    }
    Zotero.logError(asError(error));
    showAlert(win, error instanceof Error ? error.message : String(error));
  }

  private handleJobError(
    win: _ZoteroTypes.MainWindow,
    job: PersistedTranslationJob,
    error: unknown,
    progress: ProgressHandle,
  ): void {
    Zotero.logError(asError(error));
    const message =
      error instanceof ApiClientError && error.status === 401
        ? getString("error-invalid-key")
        : error instanceof Error
          ? error.message
          : String(error);
    progress.changeLine({ type: "fail", progress: 100, text: message });
    progress.startCloseTimer(10000);
    showAlert(win, message);
    if (error instanceof ApiClientError && error.status === 401) {
      this.openPreferences();
    }
    if (error instanceof ApiClientError && error.status >= 400 && !error.ambiguous) {
      if (
        error.code !== "INVALID_API_KEY" &&
        error.code !== "API_KEY_REVOKED" &&
        error.code !== "API_KEY_EXPIRED"
      ) {
        this.jobs.remove(job.localId);
      }
    }
  }
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
