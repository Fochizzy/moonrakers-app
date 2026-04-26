type AuthCallbackParams = {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  tokenHash: string | null;
  type: string | null;
  errorCode: string | null;
  errorDescription: string | null;
};

function normalizeCallbackUrl(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

function readHashParams(url: URL) {
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  return new URLSearchParams(hash);
}

function readParam(url: URL, key: string) {
  const hashParams = readHashParams(url);

  return url.searchParams.get(key) ?? hashParams.get(key);
}

function readNestedConfirmationUrl(url: URL) {
  const confirmationUrl = readParam(url, "confirmation_url");

  if (!confirmationUrl) {
    return null;
  }

  try {
    return new URL(confirmationUrl);
  } catch {
    return null;
  }
}

export function readAuthCallbackParams(rawUrl: string): AuthCallbackParams {
  const parsedUrl = normalizeCallbackUrl(rawUrl);
  if (!parsedUrl) {
    return {
      accessToken: null,
      refreshToken: null,
      code: null,
      tokenHash: null,
      type: null,
      errorCode: null,
      errorDescription: null,
    };
  }
  const confirmationUrl = readNestedConfirmationUrl(parsedUrl);
  const urls = confirmationUrl ? [parsedUrl, confirmationUrl] : [parsedUrl];

  function readAnyParam(key: string) {
    for (const url of urls) {
      const value = readParam(url, key);
      if (value) {
        return value;
      }
    }

    return null;
  }

  return {
    accessToken: readAnyParam("access_token"),
    refreshToken: readAnyParam("refresh_token"),
    code: readAnyParam("code"),
    tokenHash: readAnyParam("token_hash") ?? readAnyParam("token"),
    type: readAnyParam("type"),
    errorCode: readAnyParam("error_code"),
    errorDescription: readAnyParam("error_description"),
  };
}

export function hasAuthCallbackPayload(rawUrl: string): boolean {
  const { accessToken, refreshToken, code, tokenHash, errorCode } =
    readAuthCallbackParams(rawUrl);

  return Boolean(errorCode || code || tokenHash || (accessToken && refreshToken));
}

export function isAuthCallbackUrl(rawUrl: string): boolean {
  const parsedUrl = normalizeCallbackUrl(rawUrl);
  if (!parsedUrl) {
    return false;
  }

  return parsedUrl.protocol === "moonrakers:" &&
    parsedUrl.hostname === "auth" &&
    parsedUrl.pathname === "/callback";
}
