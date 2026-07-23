import { CREDENTIAL_ORIGIN, CREDENTIAL_REALM, CREDENTIAL_USERNAME } from "../constants";

export class CredentialStore {
  async getApiKey(): Promise<string> {
    await Services.logins.initializationPromise;
    const login = this.findLogin();
    return login?.password?.trim() || "";
  }

  async setApiKey(apiKey: string): Promise<void> {
    const normalized = apiKey.trim();
    if (!normalized) {
      throw new Error("API key is empty");
    }

    await Services.logins.initializationPromise;
    const existing = this.findLogin();
    const replacement = this.createLogin(normalized);
    if (existing) {
      Services.logins.modifyLogin(existing, replacement);
    } else {
      await Services.logins.addLoginAsync(replacement);
    }
  }

  async clearApiKey(): Promise<void> {
    await Services.logins.initializationPromise;
    for (const login of this.findAllLogins()) {
      Services.logins.removeLogin(login);
    }
  }

  private findLogin(): nsILoginInfo | undefined {
    return this.findAllLogins()[0];
  }

  private findAllLogins(): nsILoginInfo[] {
    return Services.logins
      .findLogins(CREDENTIAL_ORIGIN, null as unknown as string, CREDENTIAL_REALM)
      .filter((login) => login.username === CREDENTIAL_USERNAME);
  }

  private createLogin(apiKey: string): nsILoginInfo {
    const LoginInfo = Components.Constructor(
      "@mozilla.org/login-manager/loginInfo;1",
      Ci.nsILoginInfo,
      "init",
    );
    return new LoginInfo(
      CREDENTIAL_ORIGIN,
      null,
      CREDENTIAL_REALM,
      CREDENTIAL_USERNAME,
      apiKey,
      "",
      "",
    ) as nsILoginInfo;
  }
}
