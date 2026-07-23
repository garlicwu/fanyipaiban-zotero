import { MAX_PDF_BYTES } from "../constants";
import type { ResultKind } from "../types/api";
import type { ResolvedPdfAttachment } from "../types/job";
import { buildResultFileName, getFileBaseName, sanitizeFileName } from "../utils/files";

export type PdfSelectionErrorCode =
  | "NO_SELECTION"
  | "MULTIPLE_PDFS"
  | "MISSING_FILE"
  | "FILE_TOO_LARGE";

export class PdfSelectionError extends Error {
  constructor(public readonly code: PdfSelectionErrorCode) {
    super(code);
    this.name = "PdfSelectionError";
  }
}

export interface ResultDescriptor {
  kind: ResultKind;
  fileName: string;
  title: string;
  contentType: string;
}

export class AttachmentService {
  async resolveSelectedPdf(win: _ZoteroTypes.MainWindow): Promise<ResolvedPdfAttachment> {
    const selectedItems = win.ZoteroPane.getSelectedItems();
    if (selectedItems.length !== 1) {
      throw new PdfSelectionError("NO_SELECTION");
    }

    const selected = selectedItems[0];
    let attachment: Zotero.Item | undefined;
    let parentItemId: number | undefined;

    if (selected && isPdfAttachment(selected)) {
      attachment = selected;
      parentItemId = selected.parentItemID || undefined;
    } else if (selected && selected.isRegularItem()) {
      const attachmentIds = selected.getAttachments();
      const childItems = await Zotero.Items.getAsync(attachmentIds);
      const pdfs = childItems.filter((item) => isPdfAttachment(item));
      if (pdfs.length > 1) {
        throw new PdfSelectionError("MULTIPLE_PDFS");
      }
      attachment = pdfs[0];
      parentItemId = selected.id;
    }

    if (!attachment || typeof attachment.id !== "number") {
      throw new PdfSelectionError("NO_SELECTION");
    }

    const path = await attachment.getFilePathAsync();
    if (!path || !(await IOUtils.exists(path))) {
      throw new PdfSelectionError("MISSING_FILE");
    }

    const stat = await IOUtils.stat(path);
    const fileSize = Number(stat.size || 0);
    if (fileSize > MAX_PDF_BYTES) {
      throw new PdfSelectionError("FILE_TOO_LARGE");
    }

    const fileName =
      attachment.attachmentFilename || path.split(/[\\/]/).filter(Boolean).pop() || "document.pdf";

    return {
      attachment,
      attachmentItemId: attachment.id,
      parentItemId,
      libraryId: Number(attachment.libraryID || Zotero.Libraries.userLibraryID),
      path,
      fileName: sanitizeFileName(fileName),
      fileSize,
    };
  }

  canTranslateSelection(win: _ZoteroTypes.MainWindow): boolean {
    const selectedItems = win.ZoteroPane.getSelectedItems();
    if (selectedItems.length !== 1) {
      return false;
    }
    const selected = selectedItems[0];
    return Boolean(
      (selected && isPdfAttachment(selected)) || (selected && selected.isRegularItem()),
    );
  }

  buildResultDescriptor(params: {
    originalFileName: string;
    targetLanguage: string;
    targetLanguageLabel: string;
    kind: ResultKind;
    translatedTitle: string;
    comparisonTitle: string;
    markdownTitle: string;
  }): ResultDescriptor {
    const fileName = buildResultFileName(
      params.originalFileName,
      params.targetLanguage,
      params.kind,
    );
    const title =
      params.kind === "comparison"
        ? params.comparisonTitle
        : params.kind === "markdown"
          ? params.markdownTitle
          : params.translatedTitle;
    return {
      kind: params.kind,
      fileName,
      title,
      contentType: params.kind === "markdown" ? "text/markdown" : "application/pdf",
    };
  }

  async importResult(params: {
    descriptor: ResultDescriptor;
    downloadedPath: string;
    parentItemId?: number;
    libraryId: number;
  }): Promise<Zotero.Item> {
    return Zotero.Attachments.importFromFile({
      file: params.downloadedPath,
      libraryID: params.libraryId,
      parentItemID: params.parentItemId,
      title: params.descriptor.title,
      fileBaseName: getFileBaseName(params.descriptor.fileName),
      contentType: params.descriptor.contentType,
    });
  }
}

function isPdfAttachment(item: Zotero.Item | false | undefined): boolean {
  if (!item || !item.isAttachment()) {
    return false;
  }
  return (
    item.attachmentContentType === "application/pdf" ||
    String(item.attachmentFilename || "")
      .toLowerCase()
      .endsWith(".pdf")
  );
}
