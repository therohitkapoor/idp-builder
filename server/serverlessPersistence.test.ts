import { describe, expect, it, vi } from "vitest";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe("serverless persistence fallback", () => {
  it("does not initialize local SQLite or expose sample accounts on Netlify without DATABASE_URL", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const previousNetlify = process.env.NETLIFY;
    const previousLocalDataDir = process.env.IDP_LOCAL_DATA_DIR;
    const previousSampleAccounts = process.env.IDP_ENABLE_SAMPLE_ACCOUNTS;

    try {
      vi.resetModules();
      delete process.env.DATABASE_URL;
      delete process.env.IDP_ENABLE_SAMPLE_ACCOUNTS;
      process.env.NETLIFY = "true";
      process.env.IDP_LOCAL_DATA_DIR = "/var/task/data";

      const persistence = await import("./localPersistence");
      expect(persistence.canUseLocalPersistence).toBe(false);

      const { loginWithCredentials } = await import("./db");
      const user = await loginWithCredentials("admin@idp.local", "Admin@123");

      expect(user).toBeNull();
    } finally {
      restoreEnv("DATABASE_URL", previousDatabaseUrl);
      restoreEnv("NETLIFY", previousNetlify);
      restoreEnv("IDP_LOCAL_DATA_DIR", previousLocalDataDir);
      restoreEnv("IDP_ENABLE_SAMPLE_ACCOUNTS", previousSampleAccounts);
      vi.resetModules();
    }
  });

  it("allows hosted sample accounts only when explicitly enabled", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const previousNetlify = process.env.NETLIFY;
    const previousSampleAccounts = process.env.IDP_ENABLE_SAMPLE_ACCOUNTS;

    try {
      vi.resetModules();
      delete process.env.DATABASE_URL;
      process.env.NETLIFY = "true";
      process.env.IDP_ENABLE_SAMPLE_ACCOUNTS = "true";

      const { loginWithCredentials } = await import("./db");
      const user = await loginWithCredentials("admin@idp.local", "Admin@123");

      expect(user).toMatchObject({
        email: "admin@idp.local",
        role: "admin",
      });
    } finally {
      restoreEnv("DATABASE_URL", previousDatabaseUrl);
      restoreEnv("NETLIFY", previousNetlify);
      restoreEnv("IDP_ENABLE_SAMPLE_ACCOUNTS", previousSampleAccounts);
      vi.resetModules();
    }
  });
});
