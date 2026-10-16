const authService = require("../services/authService");
const {
  clearSessionCookie,
  readCookies,
  SESSION_COOKIE,
  setSessionCookie,
} = require("../utils/authCookies");

async function register(req, res) {
  const result = await authService.register(req.body);
  setSessionCookie(res, result.token);
  return res.status(201).json({
    success: true,
    user: result.user,
    csrfToken: result.csrfToken,
  });
}

async function login(req, res) {
  const result = await authService.login(req.body);
  setSessionCookie(res, result.token);
  return res.json({
    success: true,
    user: result.user,
    csrfToken: result.csrfToken,
  });
}

function currentUser(req, res) {
  return res.json({
    success: true,
    user: req.user,
    csrfToken: req.authSession.csrfToken,
  });
}

async function logout(req, res) {
  const token = readCookies(req.headers.cookie)[SESSION_COOKIE];
  await authService.endSession(token);
  clearSessionCookie(res);
  return res.json({ success: true });
}

module.exports = { register, login, currentUser, logout };
