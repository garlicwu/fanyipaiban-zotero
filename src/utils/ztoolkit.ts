import { ZoteroToolkit } from "zotero-plugin-toolkit";
import { config } from "../../package.json";

export function createZToolkit() {
  const toolkit = new ZoteroToolkit();
  toolkit.basicOptions.log.prefix = `[${config.addonName}]`;
  toolkit.basicOptions.log.disableConsole = __env__ === "production";
  toolkit.UI.basicOptions.ui.enableElementJSONLog = __env__ === "development";
  toolkit.UI.basicOptions.ui.enableElementDOMLog = __env__ === "development";
  toolkit.basicOptions.api.pluginID = config.addonID;
  toolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/icon-48.png`,
  );
  return toolkit;
}
