import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"] | any;
  res: CreateExpressContextOptions["res"] | any;
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

function headersToExpressShape(headers: Headers) {
  const shaped: Record<string, string> = {};
  headers.forEach((value, key) => {
    shaped[key.toLowerCase()] = value;
  });
  return shaped;
}

function getForwardedProto(headers: Record<string, string>, fallbackProtocol: string) {
  return (headers["x-forwarded-proto"] || fallbackProtocol)
    .split(",")[0]
    .trim()
    .replace(/:$/, "") || "https";
}

function createRequestShim(req: Request) {
  const url = new URL(req.url);
  const headers = headersToExpressShape(req.headers);
  return {
    headers,
    hostname: headers["x-forwarded-host"] || headers.host || url.hostname,
    protocol: getForwardedProto(headers, url.protocol),
    query: Object.fromEntries(url.searchParams.entries()),
  };
}

function createResponseShim(resHeaders: Headers) {
  const serializeCookie = (name: string, value: string, options: Record<string, any> = {}) => {
    const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    if (options.expires instanceof Date) parts.push(`Expires=${options.expires.toUTCString()}`);
    if (options.path) parts.push(`Path=${options.path}`);
    if (options.domain) parts.push(`Domain=${options.domain}`);
    if (options.httpOnly) parts.push("HttpOnly");
    if (options.secure) parts.push("Secure");
    if (options.sameSite) {
      const sameSite = String(options.sameSite).toLowerCase();
      parts.push(`SameSite=${sameSite === "none" ? "None" : sameSite === "strict" ? "Strict" : "Lax"}`);
    }
    return parts.join("; ");
  };

  return {
    cookie(name: string, value: string, options: Record<string, any> = {}) {
      resHeaders.append(
        "set-cookie",
        serializeCookie(name, value, {
          httpOnly: options.httpOnly,
          path: options.path || "/",
          sameSite: options.sameSite,
          secure: options.secure,
          maxAge: typeof options.maxAge === "number" ? Math.floor(options.maxAge / 1000) : undefined,
        })
      );
    },
    clearCookie(name: string, options: Record<string, any> = {}) {
      resHeaders.append(
        "set-cookie",
        serializeCookie(name, "", {
          httpOnly: options.httpOnly,
          path: options.path || "/",
          sameSite: options.sameSite,
          secure: options.secure,
          maxAge: 0,
          expires: new Date(0),
        })
      );
    },
  };
}

export async function createFetchContext({
  req,
  resHeaders,
}: {
  req: Request;
  resHeaders: Headers;
}): Promise<TrpcContext> {
  const requestShim = createRequestShim(req);
  const responseShim = createResponseShim(resHeaders);
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(requestShim as any);
  } catch {
    user = null;
  }

  return {
    req: requestShim,
    res: responseShim,
    user,
  };
}

export function createFetchRequestShim(req: Request) {
  return createRequestShim(req);
}

export function createFetchResponseShim(resHeaders: Headers) {
  return createResponseShim(resHeaders);
}
