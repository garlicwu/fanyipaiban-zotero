import { config } from "../package.json";
import { registerMenus } from "./ui/menu";
import { registerPreferences } from "./ui/preferences";
import { getString, initLocale } from "./utils/locale";
import { getPref, setPref } from "./utils/prefs";
import { createZToolkit } from "./utils/ztoolkit";

async function onStartup(): Promise<void> {
  await Promise.all([Zotero.initializationPromise, Zotero.unlockPromise, Zotero.uiReadyPromise]);

  initLocale();
  addon.data.preferencePaneId = await Zotero.PreferencePanes.register({
    pluginID: config.addonID,
    src: rootURI + "content/preferences.xhtml",
    label: getString("prefs-pane-title"),
    image: `chrome://${config.addonRef}/content/icons/icon-48.png`,
    helpURL: "https://www.fanyipaiban.com/developer-api/",
  });

  await Promise.all(Zotero.getMainWindows().map((win) => onMainWindowLoad(win)));

  const mainWindow = Zotero.getMainWindow();
  if (mainWindow && !getPref("firstRunNoticeShown")) {
    setPref("firstRunNoticeShown", true);
    new ztoolkit.ProgressWindow(config.addonName, {
      window: mainWindow,
      closeOnClick: true,
      closeTime: 5000,
    })
      .createLine({
        type: "success",
        text: getString("startup-ready"),
        progress: 100,
      })
      .show();
  }

  addon.data.initialized = true;
  Zotero.debug(`[${config.addonName}] startup complete`);
  void addon.services.translation.resumeAcceptedJobs().catch((error) => {
    Zotero.logError(error);
  });
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  if (addon.data.loadedWindows.has(win)) {
    return;
  }
  addon.data.loadedWindows.add(win);
  addon.data.ztoolkit = createZToolkit();
  registerMenus(win, addon.services.attachments, addon.services.translation, () =>
    addon.openPreferences(),
  );
}

async function onMainWindowUnload(win: Window): Promise<void> {
  addon.data.loadedWindows.delete(win);
  ztoolkit.unregisterAll();
}

async function onShutdown(): Promise<void> {
  ztoolkit.unregisterAll();
  addon.data.alive = false;
  // @ts-expect-error Plugin instances are attached to Zotero at runtime.
  delete Zotero[config.addonInstance];
}

async function onPrefsEvent(type: string, data: { window: Window }): Promise<void> {
  if (type === "load") {
    await registerPreferences(data.window);
  }
}

export default {
  onStartup,
  onMainWindowLoad,
  onMainWindowUnload,
  onShutdown,
  onPrefsEvent,
};
