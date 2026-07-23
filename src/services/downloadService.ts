import { DOWNLOAD_TIMEOUT_MS } from "../constants";
import type { RequestProgress, ResultKind } from "../types/api";
import { normalizeBaseURL } from "../utils/files";
import { ApiClientError, parseApiErrorText } from "./apiClient";

const RESULT_PATHS: Record<ResultKind, string> = {
  translated: "download",
  comparison: "download-comparison",
  markdown: "download-markdown",
};

export class DownloadService {
  constructor(private readonly getBaseURL: () => string) {}

  downloadResult(params: {
    apiKey: string;
    taskId: string;
    kind: ResultKind;
    destinationPath: string;
    onProgress?: (progress: RequestProgress) => void;
  }): Promise<void> {
    const endpoint = RESULT_PATHS[params.kind];
    const url = `${normalizeBaseURL(this.getBaseURL())}/tasks/${encodeURIComponent(params.taskId)}/${endpoint}`;
    return streamAuthorizedDownload({
      url,
      apiKey: params.apiKey,
      destinationPath: params.destinationPath,
      onProgress: params.onProgress,
    });
  }
}

export function streamAuthorizedDownload(params: {
  url: string;
  apiKey: string;
  destinationPath: string;
  onProgress?: (progress: RequestProgress) => void;
}): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const uri = Services.io.newURI(params.url);
    const principal = Services.scriptSecurityManager.getSystemPrincipal();
    const baseChannel = Services.io!.newChannelFromURI(
      uri,
      null as unknown as Node,
      principal,
      principal,
      Number(Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL),
      Number(Ci.nsIContentPolicy.TYPE_OTHER),
    );
    const channel = baseChannel.QueryInterface!(Ci.nsIHttpChannel);

    channel.requestMethod = "GET";
    channel.setRequestHeader("Authorization", `Bearer ${params.apiKey.trim()}`, false);
    channel.setRequestHeader("Accept", "application/octet-stream", false);

    let output: nsIBinaryOutputStream | undefined;
    let responseStatus = 0;
    let loaded = 0;
    let total = 0;
    let streamError: unknown;
    let timedOut = false;
    let finished = false;
    const errorBytes: number[] = [];

    const timeout = setTimeout(() => {
      timedOut = true;
      channel.cancel(Cr.NS_ERROR_NET_TIMEOUT);
    }, DOWNLOAD_TIMEOUT_MS);

    const cleanupPartialFile = async () => {
      try {
        await IOUtils.remove(params.destinationPath, { ignoreAbsent: true });
      } catch (error) {
        Zotero.logError(asError(error));
      }
    };

    const finish = async (requestStatus: nsresult) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timeout);
      try {
        output?.close();
      } catch (error) {
        streamError ||= error;
      }

      const requestSucceeded = Components.isSuccessCode(requestStatus);
      if (requestSucceeded && responseStatus >= 200 && responseStatus < 300 && !streamError) {
        resolve();
        return;
      }

      await cleanupPartialFile();
      if (streamError) {
        reject(
          new ApiClientError(
            "DOWNLOAD_WRITE_FAILED",
            streamError instanceof Error
              ? streamError.message
              : "Failed to write the downloaded file",
            responseStatus,
          ),
        );
        return;
      }
      if (responseStatus >= 400) {
        const text = new TextDecoder().decode(Uint8Array.from(errorBytes));
        reject(parseApiErrorText(responseStatus, text));
        return;
      }
      reject(
        new ApiClientError(
          timedOut ? "DOWNLOAD_TIMEOUT" : "DOWNLOAD_NETWORK_ERROR",
          timedOut ? "Result download timed out" : "Result download failed",
          responseStatus,
          {},
          true,
        ),
      );
    };

    const listener: nsIStreamListener = {
      onStartRequest(request) {
        const http = request.QueryInterface!(Ci.nsIHttpChannel);
        responseStatus = http.responseStatus;
        total = Math.max(0, Number(http.contentLength || 0));

        if (responseStatus >= 200 && responseStatus < 300) {
          const file = component("@mozilla.org/file/local;1").createInstance(Ci.nsIFile);
          file.initWithPath(params.destinationPath);
          const fileOutput = component("@mozilla.org/network/file-output-stream;1").createInstance(
            Ci.nsIFileOutputStream,
          );
          fileOutput.init(file, 0x02 | 0x08 | 0x20, 0o600, 0);
          const binaryOutput = component("@mozilla.org/binaryoutputstream;1").createInstance(
            Ci.nsIBinaryOutputStream,
          );
          binaryOutput.setOutputStream(fileOutput);
          output = binaryOutput;
        }
      },

      onDataAvailable(request, inputStream, _offset, count) {
        try {
          const binaryInput = component("@mozilla.org/binaryinputstream;1").createInstance(
            Ci.nsIBinaryInputStream,
          );
          binaryInput.setInputStream(inputStream);
          const bytes = binaryInput.readByteArray(count);
          if (responseStatus >= 200 && responseStatus < 300) {
            output?.writeByteArray(bytes);
            loaded += count;
            params.onProgress?.({ loaded, total });
          } else if (errorBytes.length < 128 * 1024) {
            const remaining = 128 * 1024 - errorBytes.length;
            errorBytes.push(...bytes.slice(0, remaining));
          }
        } catch (error) {
          streamError = error;
          request.cancel(Cr.NS_ERROR_FAILURE);
        }
      },

      onStopRequest(_request, statusCode) {
        void finish(statusCode);
      },

      QueryInterface: ChromeUtils.generateQI(["nsIStreamListener", "nsIRequestObserver"]),
    };

    try {
      channel.asyncOpen(listener);
    } catch (error) {
      clearTimeout(timeout);
      void cleanupPartialFile();
      reject(
        new ApiClientError(
          "DOWNLOAD_START_FAILED",
          error instanceof Error ? error.message : "Unable to start download",
          0,
          {},
          true,
        ),
      );
    }
  });
}

interface ComponentClass {
  createInstance<T>(interfaceId: T): nsQIResult<T>;
}

function component(contractId: string): ComponentClass {
  const value = Cc[contractId];
  if (!value) {
    throw new Error(`XPCOM component is unavailable: ${contractId}`);
  }
  return value;
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
