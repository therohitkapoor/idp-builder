import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { loginWithCredentials, saveAdminConfiguration } from "./db";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { createDefaultAdminConfiguration } from "../shared/adminConfig";
import type { TrpcContext } from "./_core/context";
import { sdk } from "./_core/sdk";

type CookieCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

function createPublicContext(): { ctx: TrpcContext; cookies: CookieCall[] } {
  const cookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookies.push({ name, value, options });
      },
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx, cookies };
}

describe("auth.login", () => {
  it("signs in an admin account and sets a session cookie", async () => {
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      email: "admin@idp.local",
      password: "Admin@123",
    });

    expect(result.success).toBe(true);
    expect(result.user.role).toBe("admin");
    expect(result.user.email).toBe("admin@idp.local");
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
    expect(cookies[0]?.value).toEqual(expect.any(String));
    expect(cookies[0]?.options).toMatchObject({
      maxAge: ONE_YEAR_MS,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });

  it("authenticates the issued credential session cookie without requiring an OAuth app id", async () => {
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.auth.login({
      email: "admin@idp.local",
      password: "Admin@123",
    });

    const sessionCookie = cookies[0];
    expect(sessionCookie?.name).toBe(COOKIE_NAME);

    const authenticatedRequest = {
      protocol: "https",
      headers: {
        cookie: `${COOKIE_NAME}=${sessionCookie?.value}`,
      },
    } as TrpcContext["req"];
    const authenticatedUser = await sdk.authenticateRequest(authenticatedRequest);

    const authenticatedCaller = appRouter.createCaller({
      user: authenticatedUser,
      req: authenticatedRequest,
      res: {
        cookie: vi.fn(),
        clearCookie: vi.fn(),
      } as unknown as TrpcContext["res"],
    });

    const me = await authenticatedCaller.auth.me();

    expect(me).toMatchObject({
      email: "admin@idp.local",
      role: "admin",
    });
  });

  it("rejects a tampered credential session cookie", async () => {
    await expect(
      sdk.authenticateRequest({
        protocol: "https",
        headers: {
          cookie: `${COOKIE_NAME}=not-a-valid-token`,
        },
      } as TrpcContext["req"])
    ).rejects.toThrow("Invalid session cookie");
  });

  it("signs in a user account with the user role", async () => {
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      email: "user@idp.local",
      password: "User@123",
    });

    expect(result.success).toBe(true);
    expect(result.user.role).toBe("user");
    expect(result.user.email).toBe("user@idp.local");
    expect(cookies).toHaveLength(1);
  });

  it("creates participant login access aligned to the participant organization", async () => {
    const config = createDefaultAdminConfiguration();
    const organization = {
      ...config.organization,
      id: "org-credential-sync",
      organizationName: "Credential Sync Org",
    };
    const email = "participant.sync@example.com";
    const password = "Sync@12345";

    await saveAdminConfiguration({
      ...config,
      organization,
      organizations: [organization],
      selectedOrganizationId: organization.id,
      participants: [
        {
          id: "participant-sync-1",
          organizationId: organization.id,
          name: "Participant Sync",
          email,
          generatedPassword: password,
          role: "Leader",
          department: "Operations",
          managerName: "Manager Sync",
          status: "active",
          addedAt: new Date("2026-07-15T00:00:00.000Z").toISOString(),
        },
      ],
    });

    const syncedUser = await loginWithCredentials(email, password);

    expect(syncedUser).toMatchObject({
      email,
      role: "user",
      organizationId: organization.id,
      organizationName: organization.organizationName,
      participantId: "participant-sync-1",
    });
  });

  it("rejects an incorrect password without setting a session cookie", async () => {
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({
        email: "admin@idp.local",
        password: "wrong-password",
      })
    ).rejects.toThrow("Invalid email or password.");

    expect(cookies).toHaveLength(0);
  });
});
