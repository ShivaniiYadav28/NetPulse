const test = require("node:test");
const assert = require("node:assert/strict");
const {
  hashPassword,
  verifyPassword,
  validateRegistration,
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
