import { describe, expect, it, vi } from "vitest";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

describe("production environment hardening", () => {
  it("requires a JWT_SECRET for hosted deployments outside test mode", async () => {
    const previousJwtSecret = process.env.JWT_SECRET;
    const previousNetlify = process.env.NETLIFY;
    const previousVitest = process.env.VITEST;
    const previousVitestWorker = process.env.VITEST_WORKER_ID;

    try {
      vi.resetModules();
      delete process.env.JWT_SECRET;
      delete process.env.VITEST;
      delete process.env.VITEST_WORKER_ID;
      process.env.NETLIFY = "true";

      await expect(import("./_core/env")).rejects.toThrow(/JWT_SECRET is required/);
    } finally {
      restoreEnv("JWT_SECRET", previousJwtSecret);
      restoreEnv("NETLIFY", previousNetlify);
      restoreEnv("VITEST", previousVitest);
      restoreEnv("VITEST_WORKER_ID", previousVitestWorker);
      vi.resetModules();
    }
  });
});
