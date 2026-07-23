import { config } from "../../package.json";

type PluginPrefsMap = _ZoteroTypes.Prefs["PluginPrefsMap"];

export function getPref<K extends keyof PluginPrefsMap>(key: K) {
  return Zotero.Prefs.get(`${config.prefsPrefix}.${key}`, true) as PluginPrefsMap[K];
}

export function setPref<K extends keyof PluginPrefsMap>(key: K, value: PluginPrefsMap[K]) {
  return Zotero.Prefs.set(`${config.prefsPrefix}.${key}`, value, true);
}

export function clearPref(key: keyof PluginPrefsMap) {
  return Zotero.Prefs.clear(`${config.prefsPrefix}.${key}`, true);
}
