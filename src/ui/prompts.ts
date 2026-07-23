import { getString } from "../utils/locale";

export type TranslationConfirmation = "translate" | "settings" | "cancel";
export type InsufficientCreditsChoice = "recharge" | "refresh" | "cancel";

export function showAlert(win: Window, message: string, title = getString("error-title")): void {
  Services.prompt.alert(win as unknown as mozIDOMWindowProxy, title, message);
}

export function confirmTranslation(win: Window, message: string): TranslationConfirmation {
  const result = Services.prompt.confirmEx(
    win as unknown as mozIDOMWindowProxy,
    getString("confirm-title"),
    message,
    stringButton(0) | cancelButton(1) | stringButton(2),
    getString("confirm-translate"),
    "",
    getString("confirm-settings"),
    "",
    { value: false },
  );
  if (result === 0) {
    return "translate";
  }
  if (result === 2) {
    return "settings";
  }
  return "cancel";
}

export function confirmInsufficientCredits(
  win: Window,
  message: string,
): InsufficientCreditsChoice {
  const result = Services.prompt.confirmEx(
    win as unknown as mozIDOMWindowProxy,
    getString("insufficient-title"),
    message,
    stringButton(0) | cancelButton(1) | stringButton(2),
    getString("insufficient-recharge"),
    "",
    getString("insufficient-refresh"),
    "",
    { value: false },
  );
  if (result === 0) {
    return "recharge";
  }
  if (result === 2) {
    return "refresh";
  }
  return "cancel";
}

export function confirmRechargeReady(win: Window): boolean {
  return Services.prompt.confirm(
    win as unknown as mozIDOMWindowProxy,
    getString("insufficient-title"),
    getString("recharge-ready"),
  );
}

function stringButton(position: 0 | 1 | 2): number {
  return buttonFlag(position, Number(Services.prompt.BUTTON_TITLE_IS_STRING));
}

function cancelButton(position: 0 | 1 | 2): number {
  return buttonFlag(position, Number(Services.prompt.BUTTON_TITLE_CANCEL));
}

function buttonFlag(position: 0 | 1 | 2, titleFlag: number): number {
  const positionFlag =
    position === 0
      ? Number(Services.prompt.BUTTON_POS_0)
      : position === 1
        ? Number(Services.prompt.BUTTON_POS_1)
        : Number(Services.prompt.BUTTON_POS_2);
  return positionFlag * titleFlag;
}
