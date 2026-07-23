import { config } from "../../package.json";

interface FluentPattern {
  value: string | null;
  attributes: Array<{ name: string; value: string }> | null;
}

export function initLocale() {
  const LocalizationClass =
    typeof Localization === "undefined" ? ztoolkit.getGlobal("Localization") : Localization;
  addon.data.locale = {
    current: new LocalizationClass([`${config.addonRef}-addon.ftl`], true),
  };
}

export function getString(id: string, args?: Record<string, string | number>): string {
  const fullId = `${config.addonRef}-${id}`;
  const pattern = addon.data.locale?.current.formatMessagesSync([{ id: fullId, args }])[0] as
    | FluentPattern
    | undefined;
  return pattern?.value || fullId;
}
