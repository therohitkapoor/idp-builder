import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { appRouter } from "../../server/routers";
import * as db from "../../server/db";
import {
  createFetchContext,
  createFetchRequestShim,
  createFetchResponseShim,
} from "../../server/_core/context";
import { getSessionCookieOptions } from "../../server/_core/cookies";
import { sdk } from "../../server/_core/sdk";

export const config = {
  path: "/api/*",
};

const json = (body: unknown, init?: ResponseInit) =>
  Response.json(body, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });

const getPathname = (req: Request) => new URL(req.url).pathname.replace(/\/+$/, "");

const getTrpcEndpoint = (pathname: string) =>
  pathname.startsWith("/.netlify/functions/api/trpc")
    ? "/.netlify/functions/api/trpc"
    : "/api/trpc";

async function handleOAuthCallback(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return json({ error: "code and state are required" }, { status: 400 });
  }

  const resHeaders = new Headers();
  const requestShim = createFetchRequestShim(req);
  const responseShim = createFetchResponseShim(resHeaders);

  try {
    const tokenResponse = await sdk.exchangeCodeForToken(code, state);
    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

    if (!userInfo.openId) {
      return json({ error: "openId missing from user info" }, { status: 400 });
    }

    await db.upsertUser({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(userInfo.openId, {
      name: userInfo.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    responseShim.cookie(COOKIE_NAME, sessionToken, {
      ...getSessionCookieOptions(requestShim as any),
      maxAge: ONE_YEAR_MS,
    });

    resHeaders.set("location", "/");
    return new Response(null, {
      status: 302,
      headers: resHeaders,
    });
  } catch (error) {
    console.error("[OAuth] Netlify callback failed", error);
    return json({ error: "OAuth callback failed" }, { status: 500 });
  }
}

export default async function handler(req: Request) {
  const pathname = getPathname(req);

  if (pathname.endsWith("/oauth/callback")) {
    return handleOAuthCallback(req);
  }

  if (pathname.includes("/trpc")) {
    return fetchRequestHandler({
      endpoint: getTrpcEndpoint(pathname),
      req,
      router: appRouter,
      createContext: ({ req, resHeaders }) => createFetchContext({ req, resHeaders }),
      onError({ error, path }) {
        console.error(`[tRPC] Netlify function error on ${path || "unknown path"}:`, error);
      },
    });
  }

  return json({ error: "Not found" }, { status: 404 });
}
