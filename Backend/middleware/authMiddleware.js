const { timingSafeEqual } = require("node:crypto");

const authService = require("../services/authService");
const {
  SESSION_COOKIE,
  readCookies,
} = require("../utils/authCookies");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function allowedOrigin() {
  return (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
}

function requireAllowedOrigin(req, res, next) {
  const origin = req.get("origin");

  if (origin && origin !== allowedOrigin()) {
    return res.status(403).json({
      success: false,
      message: "Origin is not allowed",
    });
  }

  return next();
}

async function attachSession(req) {
  const cookies = readCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];

  if (!token) {
    return null;
  }

  const auth = await authService.getSession(token);

  if (!auth) {
    return null;
  }

  req.authToken = token;
  req.authSession = auth.session;

  req.user = {
    id: String(auth.user._id),
    email: auth.user.email,
    displayName: auth.user.displayName,
  };

  return auth;
}

async function authenticate(req, res, next) {
  try {
    const auth = await attachSession(req);

    if (!auth) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

async function optionalAuthenticate(req, res, next) {
  try {
    await attachSession(req);
    return next();
  } catch (error) {
    return next(error);
  }
}

function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (!req.authSession) {
    return next();
  }

  const origin = req.get("origin");
  const header = req.get("x-csrf-token") || "";
  const expected = req.authSession.csrfToken || "";

  const headerBytes = Buffer.from(header);
  const expectedBytes = Buffer.from(expected);

  const invalidToken =
    !header ||
    !expected ||
    headerBytes.length !== expectedBytes.length ||
    !timingSafeEqual(headerBytes, expectedBytes);

  if ((origin && origin !== allowedOrigin()) || invalidToken) {
    return res.status(403).json({
      success: false,
      message: "CSRF validation failed",
    });
  }

  return next();
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  csrfProtection,
  requireAllowedOrigin,
};
