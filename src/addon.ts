import { config } from "../package.json";
import hooks from "./hooks";
import { PRODUCTION_API_BASE_URL } from "./constants";
import { FanyiPaibanApiClient } from "./services/apiClient";
import { AttachmentService } from "./services/attachmentService";
import { CredentialStore } from "./services/credentialStore";
import { DownloadService } from "./services/downloadService";
import { JobStore } from "./services/jobStore";
import { TranslationService } from "./services/translationService";
import { getPref } from "./utils/prefs";
import { createZToolkit } from "./utils/ztoolkit";

class Addon {
  public data: {
    alive: boolean;
    initialized: boolean;
    config: typeof config;
    env: "development" | "production";
    ztoolkit: ZToolkit;
    locale?: { current: any };
    preferencePaneId?: string;
    loadedWindows: WeakSet<Window>;
  };

  public readonly hooks = hooks;
  public readonly services: {
    credentials: CredentialStore;
    jobs: JobStore;
    attachments: AttachmentService;
    api: FanyiPaibanApiClient;
    downloads: DownloadService;
    translation: TranslationService;
  };

  constructor() {
    const credentials = new CredentialStore();
    const jobs = new JobStore();
    const attachments = new AttachmentService();
    const getBaseURL = () => String(getPref("serverURL") || PRODUCTION_API_BASE_URL);
    const api = new FanyiPaibanApiClient(getBaseURL);
    const downloads = new DownloadService(getBaseURL);

    this.data = {
      alive: true,
      initialized: false,
      config,
      env: __env__,
      ztoolkit: createZToolkit(),
      loadedWindows: new WeakSet<Window>(),
    };
    this.services = {
      credentials,
      jobs,
      attachments,
      api,
      downloads,
      translation: new TranslationService(credentials, api, downloads, jobs, attachments, () =>
        this.openPreferences(),
      ),
    };
  }

  openPreferences(): void {
    if (this.data.preferencePaneId) {
      Zotero.Utilities.Internal.openPreferences(this.data.preferencePaneId);
      return;
    }
    Zotero.Utilities.Internal.openPreferences("general");
  }
}

export default Addon;
