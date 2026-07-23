import {
  API_KEY_MANAGEMENT_URL,
  DEVELOPER_DOCS_URL,
  LANGUAGE_OPTIONS,
  PRIVACY_URL,
  PRODUCTION_API_BASE_URL,
  RECHARGE_URL,
  REFUND_URL,
  SUPPORT_EMAIL_URL,
  TERMS_URL,
} from "../constants";
import { ApiClientError } from "../services/apiClient";
import { formatCredits, normalizeBaseURL } from "../utils/files";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";

export async function registerPreferences(win: Window): Promise<void> {
  const doc = win.document;
  const root = doc.querySelector<HTMLElement>(".fp-preferences");
  if (!root || root.dataset.bound === "true") {
    return;
  }
  root.dataset.bound = "true";

  const apiKeyInput = requiredElement<HTMLInputElement>(doc, "fp-api-key");
  const toggleApiKey = requiredElement<HTMLButtonElement>(doc, "fp-toggle-api-key");
  const targetLanguage = requiredElement<HTMLSelectElement>(doc, "fp-target-language");
  const comparison = requiredElement<HTMLInputElement>(doc, "fp-output-comparison");
  const markdown = requiredElement<HTMLInputElement>(doc, "fp-output-markdown");
  const confirmSubmit = requiredElement<HTMLInputElement>(doc, "fp-confirm-submit");
  const serverURL = requiredElement<HTMLInputElement>(doc, "fp-server-url");

  for (const language of LANGUAGE_OPTIONS) {
    const option = doc.createElement("option");
    option.value = language.code;
    option.textContent = getString(language.localeKey);
    targetLanguage.appendChild(option);
  }

  targetLanguage.value = String(getPref("targetLanguage") || "cn");
  comparison.checked = Boolean(getPref("downloadComparison"));
  markdown.checked = Boolean(getPref("downloadMarkdown"));
  confirmSubmit.checked = Boolean(getPref("confirmBeforeSubmit"));
  serverURL.value = String(getPref("serverURL") || PRODUCTION_API_BASE_URL);
  apiKeyInput.value = await addon.services.credentials.getApiKey();
  updateApiKeyVisibilityLabel(apiKeyInput, toggleApiKey);

  targetLanguage.addEventListener("change", () => {
    setPref("targetLanguage", targetLanguage.value || "cn");
  });
  comparison.addEventListener("change", () => {
    setPref("downloadComparison", comparison.checked);
  });
  markdown.addEventListener("change", () => {
    setPref("downloadMarkdown", markdown.checked);
  });
  confirmSubmit.addEventListener("change", () => {
    setPref("confirmBeforeSubmit", confirmSubmit.checked);
  });
  serverURL.addEventListener("change", () => {
    const normalized = normalizeBaseURL(serverURL.value || PRODUCTION_API_BASE_URL);
    serverURL.value = normalized;
    setPref("serverURL", normalized);
  });

  bindClick(doc, "fp-toggle-api-key", () => {
    apiKeyInput.type = apiKeyInput.type === "password" ? "text" : "password";
    updateApiKeyVisibilityLabel(apiKeyInput, toggleApiKey);
  });
  bindClick(doc, "fp-save-api-key", async () => {
    const value = apiKeyInput.value.trim();
    if (!value) {
      await addon.services.credentials.clearApiKey();
      await setConnectionState(doc, "idle", "pref-status-not-configured");
      updateBalance(doc, 0, 0);
      return;
    }
    await withBusy(doc, async () => {
      await addon.services.credentials.setApiKey(value);
      await testConnection(doc, value);
    });
  });
  bindClick(doc, "fp-clear-api-key", async () => {
    await addon.services.credentials.clearApiKey();
    apiKeyInput.value = "";
    updateBalance(doc, 0, 0);
    await setConnectionState(doc, "idle", "pref-status-not-configured");
  });
  bindClick(doc, "fp-refresh-balance", async () => {
    await withBusy(doc, async () => {
      const apiKey = await addon.services.credentials.getApiKey();
      if (!apiKey) {
        await setConnectionState(doc, "idle", "pref-status-not-configured");
        return;
      }
      await testConnection(doc, apiKey);
    });
  });
  bindClick(doc, "fp-reset-server-url", () => {
    serverURL.value = PRODUCTION_API_BASE_URL;
    setPref("serverURL", PRODUCTION_API_BASE_URL);
  });

  bindExternalLink(doc, "fp-manage-api-key", API_KEY_MANAGEMENT_URL);
  bindExternalLink(doc, "fp-recharge", RECHARGE_URL);
  bindExternalLink(doc, "fp-open-developer-docs", DEVELOPER_DOCS_URL);
  bindExternalLink(doc, "fp-privacy", PRIVACY_URL);
  bindExternalLink(doc, "fp-terms", TERMS_URL);
  bindExternalLink(doc, "fp-refund", REFUND_URL);
  bindExternalLink(doc, "fp-support-email", SUPPORT_EMAIL_URL);

  if (apiKeyInput.value) {
    void testConnection(doc, apiKeyInput.value).catch((error) => {
      Zotero.logError(error);
    });
  } else {
    await setConnectionState(doc, "idle", "pref-status-not-configured");
  }
}

async function testConnection(doc: Document, apiKey: string): Promise<void> {
  await setConnectionState(doc, "loading", "pref-status-testing");
  try {
    const balance = await addon.services.api.getBalance(apiKey);
    updateBalance(doc, balance.availableToken, balance.frozenToken);
    await setConnectionState(doc, "success", "pref-status-connected");
  } catch (error) {
    updateBalance(doc, 0, 0);
    await setConnectionState(doc, "error", "pref-status-failed");
    if (error instanceof ApiClientError) {
      requiredElement<HTMLElement>(doc, "fp-connection-status").title = error.message;
    }
    throw error;
  }
}

async function withBusy(doc: Document, action: () => Promise<void>) {
  const buttons = Array.from(doc.querySelectorAll(".fp-preferences button")) as HTMLButtonElement[];
  buttons.forEach((button) => {
    button.disabled = true;
  });
  try {
    await action();
  } catch (error) {
    Zotero.logError(error instanceof Error ? error : new Error(String(error)));
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

function updateBalance(doc: Document, available: number, frozen: number): void {
  requiredElement<HTMLElement>(doc, "fp-available-credits").textContent = formatCredits(available);
  requiredElement<HTMLElement>(doc, "fp-frozen-credits").textContent = formatCredits(frozen);
}

function updateApiKeyVisibilityLabel(input: HTMLInputElement, button: HTMLButtonElement): void {
  const visible = input.type === "text";
  const label = getString(visible ? "hide-api-key" : "show-api-key");
  button.title = label;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", String(visible));
}

async function setConnectionState(
  doc: Document,
  state: "idle" | "loading" | "success" | "error",
  localizationId: string,
): Promise<void> {
  const status = requiredElement<HTMLElement>(doc, "fp-connection-status");
  status.dataset.state = state;
  status.textContent = getString(localizationId.replace(/^pref-/, ""));
  status.title = "";
}

function bindClick(doc: Document, id: string, listener: () => void | Promise<void>): void {
  requiredElement<HTMLElement>(doc, id).addEventListener("click", (event) => {
    event.preventDefault();
    void listener();
  });
}

function bindExternalLink(doc: Document, id: string, url: string): void {
  bindClick(doc, id, () => Zotero.launchURL(url));
}

function requiredElement<T extends Element>(doc: Document, id: string): T {
  const element = doc.getElementById(id);
  if (!element) {
    throw new Error(`Missing preference element: ${id}`);
  }
  return element as T;
}
