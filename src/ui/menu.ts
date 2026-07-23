import { config } from "../../package.json";
import type { AttachmentService } from "../services/attachmentService";
import type { TranslationService } from "../services/translationService";
import { getString } from "../utils/locale";

export function registerMenus(
  win: _ZoteroTypes.MainWindow,
  attachmentService: AttachmentService,
  translationService: TranslationService,
  openPreferences: () => void,
): void {
  const icon = `chrome://${config.addonRef}/content/icons/icon-48.png`;
  const translateCommand = () => {
    void translationService.translateSelected(win).catch((error) => {
      Zotero.logError(error);
    });
  };

  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: "zotero-itemmenu-fanyipaiban-translate",
    label: getString("menu-translate"),
    icon,
    commandListener: translateCommand,
    isHidden: () => !attachmentService.canTranslateSelection(win),
  });

  ztoolkit.Menu.register("menuTools", {
    tag: "menuitem",
    id: "menu-tools-fanyipaiban-translate",
    label: getString("menu-translate"),
    icon,
    commandListener: translateCommand,
    isDisabled: () => !attachmentService.canTranslateSelection(win),
  });

  ztoolkit.Menu.register("menuTools", {
    tag: "menuitem",
    id: "menu-tools-fanyipaiban-settings",
    label: getString("menu-settings"),
    commandListener: openPreferences,
  });
}
