const IS_PRODUCTION = process.env.NODE_ENV === "production";

const SESSION_COOKIE = IS_PRODUCTION
  ? "__Host-netpulse_session"
  : "netpulse_session";

const SESSION_TTL_DAYS = Number(
  process.env.AUTH_SESSION_TTL_DAYS || 7,
);

if (
  !Number.isInteger(SESSION_TTL_DAYS) ||
  SESSION_TTL_DAYS < 1 ||
  SESSION_TTL_DAYS > 30
) {
  throw new Error(
    "AUTH_SESSION_TTL_DAYS must be an integer from 1 to 30",
  );
}

const SESSION_TTL_MS =
  SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

function readCookies(header = "") {
  return Object.fromEntries(
    header.split(";").flatMap((part) => {
      const separator = part.indexOf("=");

      if (separator < 0) {
        return [];
      }

      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();

      try {
        return [[name, decodeURIComponent(value)]];
      } catch {
        return [];
      }
    }),
  );
}

function buildCookieAttributes(maxAge) {
  const attributes = [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];

  if (IS_PRODUCTION) {
    attributes.push("Secure");
  }

  return attributes;
}

function setSessionCookie(res, token) {
  const cookie = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    ...buildCookieAttributes(
      Math.floor(SESSION_TTL_MS / 1000),
    ),
  ];

  res.setHeader("Set-Cookie", cookie.join("; "));
}

function clearSessionCookie(res) {
  const cookie = [
    `${SESSION_COOKIE}=`,
    ...buildCookieAttributes(0),
  ];

  res.setHeader("Set-Cookie", cookie.join("; "));
}

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  readCookies,
  setSessionCookie,
  clearSessionCookie,
};
