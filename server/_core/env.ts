const localCookieSecret = "idp-builder-local-session-secret";
const isHostedRuntime = Boolean(
  process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV ||
    process.env.DATABASE_URL
);
const isTestRuntime = Boolean(process.env.VITEST || process.env.VITEST_WORKER_ID);

if (!process.env.JWT_SECRET && isHostedRuntime && !isTestRuntime) {
  throw new Error(
    "JWT_SECRET is required for hosted or database-backed deployments. Set a strong random secret before starting the IDP Builder."
  );
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET || localCookieSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
