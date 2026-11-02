const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/User");
const AuthSession = require("../models/AuthSession");
const {
  hashPassword,
  verifyPassword,
  validateRegistration,
  register,
  login,
  getSession,
  hashToken,
} = require("../services/authService");

test("password hashing verifies only the original password", async () => {
  const encoded = await hashPassword("very-long-passphrase");
  assert.match(encoded, /^scrypt\$32768\$8\$1\$/);
  assert.equal(await verifyPassword("very-long-passphrase", encoded), true);
  assert.equal(await verifyPassword("different-passphrase", encoded), false);
});

test("registration input is validated without accepting short passwords", () => {
  assert.equal(
    validateRegistration({
      email: "person@example.com",
      displayName: "Person",
      password: "long-enough-passphrase",
    }),
    null,
  );
  assert.equal(
    validateRegistration({
      email: "not-an-email",
      displayName: "Person",
      password: "short",
    }),
    "Enter a valid email address",
  );
});

test("registration hashes the password and creates a session", async (t) => {
  let createdUser;
  let createdSession;
  const user = {
    _id: "user-1",
    email: "person@example.com",
    displayName: "Person",
  };

  t.mock.method(User, "create", async (document) => {
    createdUser = document;
    return user;
  });
  t.mock.method(AuthSession, "create", async (document) => {
    createdSession = document;
    return document;
  });

  const result = await register({
    email: " Person@Example.com ",
    displayName: " Person ",
    password: "correct horse battery staple",
  });

  assert.equal(createdUser.email, "person@example.com");
  assert.equal(createdUser.displayName, "Person");
  assert.equal(
    await verifyPassword("correct horse battery staple", createdUser.passwordHash),
    true,
  );
  assert.equal(createdSession.userId, user._id);
  assert.equal(createdSession.tokenHash, hashToken(result.token));
  assert.equal(result.user.email, user.email);
  assert.equal(typeof result.csrfToken, "string");
});

test("login verifies the same stored password format and creates a session", async (t) => {
  const password = "correct horse battery staple";
  const user = {
    _id: "user-2",
    email: "person@example.com",
    displayName: "Person",
    passwordHash: await hashPassword(password),
  };
  let sessionCreated = false;

  t.mock.method(User, "findOne", () => ({
    select: async () => user,
  }));
  t.mock.method(AuthSession, "create", async () => {
    sessionCreated = true;
  });

  const result = await login({ email: " PERSON@example.com ", password });

  assert.equal(sessionCreated, true);
  assert.equal(result.user.id, user._id);
  assert.equal(result.user.email, user.email);
});

test("login rejects an incorrect password", async (t) => {
  const user = {
    _id: "user-3",
    email: "person@example.com",
    displayName: "Person",
    passwordHash: await hashPassword("correct horse battery staple"),
  };

  t.mock.method(User, "findOne", () => ({
    select: async () => user,
  }));

  await assert.rejects(
    login({ email: user.email, password: "incorrect password" }),
    { statusCode: 401, message: "Email or password is incorrect" },
  );
});

test("session verification checks expiry, token hash, and user", async (t) => {
  const token = "valid-session-token";
  const session = {
    userId: "user-4",
    csrfToken: "csrf-value",
  };
  const user = {
    _id: "user-4",
    email: "person@example.com",
    displayName: "Person",
  };

  t.mock.method(AuthSession, "findOne", (query) => {
    if (query.tokenHash !== hashToken(token)) {
      return { select: async () => null };
    }

    assert.ok(query.expiresAt.$gt instanceof Date);
    return { select: async () => session };
  });
  t.mock.method(User, "findById", (id) => {
    assert.equal(id, session.userId);
    return { select: async () => user };
  });

  const result = await getSession(token);

  assert.deepEqual(result, { session, user });
  assert.equal(await getSession(""), null);
});
