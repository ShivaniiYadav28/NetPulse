const { promisify } = require("node:util");
const {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} = require("node:crypto");

const User = require("../models/User");
const AuthSession = require("../models/AuthSession");
const { SESSION_TTL_MS } = require("../utils/authCookies");

const scryptAsync = promisify(scrypt);

const SCRYPT_OPTIONS = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    displayName: user.displayName,
  };
}

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateRegistration(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return "Request body must be an object";
  }

  const { email, password, displayName } = input;

  if (
    typeof email !== "string" ||
    email.trim().length > 254 ||
    !EMAIL_PATTERN.test(email.trim())
  ) {
    return "Enter a valid email address";
  }

  if (
    typeof displayName !== "string" ||
    !displayName.trim() ||
    displayName.trim().length > 80
  ) {
    return "Display name must be 1 to 80 characters";
  }

  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  ) {
    return "Password must be 12 to 128 characters";
  }

  return null;
}

async function hashPassword(password) {
  const salt = randomBytes(16);

  const derivedKey = await scryptAsync(
    password,
    salt,
    64,
    SCRYPT_OPTIONS,
  );

  return [
    "scrypt",
    "32768",
    "8",
    "1",
    salt.toString("base64url"),
    Buffer.from(derivedKey).toString("base64url"),
  ].join("$");
}

async function verifyPassword(password, storedHash) {
  if (
    typeof password !== "string" ||
    typeof storedHash !== "string"
  ) {
    return false;
  }

  const parts = storedHash.split("$");

  if (parts.length !== 6) {
    return false;
  }

  const [algorithm, n, r, p, saltEncoded, hashEncoded] = parts;

  if (
    algorithm !== "scrypt" ||
    n !== "32768" ||
    r !== "8" ||
    p !== "1" ||
    !/^[A-Za-z0-9_-]+$/.test(saltEncoded) ||
    !/^[A-Za-z0-9_-]+$/.test(hashEncoded)
  ) {
    return false;
  }

  try {
    const salt = Buffer.from(saltEncoded, "base64url");
    const expectedHash = Buffer.from(hashEncoded, "base64url");

    if (salt.length !== 16 || expectedHash.length !== 64) {
      return false;
    }

    const derivedKey = Buffer.from(
      await scryptAsync(
        password,
        salt,
        expectedHash.length,
        SCRYPT_OPTIONS,
      ),
    );

    return (
      expectedHash.length === derivedKey.length &&
      timingSafeEqual(expectedHash, derivedKey)
    );
  } catch {
    return false;
  }
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function startSession(user) {
  const token = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");

  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await AuthSession.create({
    userId: user._id,
    tokenHash: hashToken(token),
    csrfToken,
    expiresAt,
  });

  return {
    token,
    csrfToken,
    expiresAt,
    user: publicUser(user),
  };
}

async function register(input) {
  const validationError = validateRegistration(input);

  if (validationError) {
    throw createHttpError(validationError, 400);
  }

  const email = input.email.trim().toLowerCase();

  try {
    const user = await User.create({
      email,
      displayName: input.displayName.trim(),
      passwordHash: await hashPassword(input.password),
    });

    return startSession(user);
  } catch (error) {
    if (error.code === 11000) {
      throw createHttpError(
        "An account with this email already exists",
        409,
      );
    }

    throw error;
  }
}

async function login(input) {
  if (
    !input ||
    typeof input.email !== "string" ||
    typeof input.password !== "string" ||
    input.email.trim().length > 254 ||
    input.password.length > 128
  ) {
    throw createHttpError(
      "Email or password is incorrect",
      401,
    );
  }

  const user = await User.findOne({
    email: input.email.trim().toLowerCase(),
  }).select("+passwordHash");

  let passwordMatches = false;

  if (user) {
    passwordMatches = await verifyPassword(
      input.password,
      user.passwordHash,
    );
  } else {
    // Reduce the timing difference for unknown email addresses.
    await scryptAsync(
      input.password,
      Buffer.alloc(16),
      64,
      SCRYPT_OPTIONS,
    );
  }

  if (!user || !passwordMatches) {
    throw createHttpError(
      "Email or password is incorrect",
      401,
    );
  }

  return startSession(user);
}

async function getSession(token) {
  if (typeof token !== "string" || token.length > 256) {
    return null;
  }

  const session = await AuthSession.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  }).select("+csrfToken");

  if (!session) {
    return null;
  }

  const user = await User.findById(session.userId).select(
    "_id email displayName",
  );

  if (!user) {
    return null;
  }

  return { session, user };
}

async function endSession(token) {
  if (typeof token === "string" && token.length <= 256) {
    await AuthSession.deleteOne({
      tokenHash: hashToken(token),
    });
  }
}

module.exports = {
  validateRegistration,
  hashPassword,
  verifyPassword,
  register,
  login,
  getSession,
  endSession,
  publicUser,
  hashToken,
};
