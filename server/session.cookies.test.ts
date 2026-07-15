import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions } from "./_core/cookies";

describe("session cookie options", () => {
  it("uses SameSite=None only for secure requests", () => {
    const options = getSessionCookieOptions({
      protocol: "https",
      headers: {},
    } as Request);

    expect(options).toMatchObject({
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });

  it("uses a localhost-compatible cookie policy for plain HTTP", () => {
    const options = getSessionCookieOptions({
      protocol: "http",
      headers: {},
    } as Request);

    expect(options).toMatchObject({
      secure: false,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
  });
});
