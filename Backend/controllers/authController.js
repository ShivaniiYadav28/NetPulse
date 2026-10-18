const authService = require("../services/authService");
const User = require("../models/User");

const {
  clearSessionCookie,
  readCookies,
  SESSION_COOKIE,
  setSessionCookie,
} = require("../utils/authCookies");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ALERT_EMAILS = 10;

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

async function updateAlertEmail(req, res) {
  try {
    const body =
      req.body && typeof req.body === "object" ? req.body : {};

    const hasAlertEmails = Object.prototype.hasOwnProperty.call(
      body,
      "alertEmails",
    );
    const hasLegacyAlertEmail = Object.prototype.hasOwnProperty.call(
      body,
      "alertEmail",
    );

    if (!hasAlertEmails && !hasLegacyAlertEmail) {
      return res.status(400).json({
        success: false,
        message:
          "Provide alertEmails as an array, or alertEmail as a single address.",
      });
    }

    let rawRecipients;

    if (hasAlertEmails) {
      if (!Array.isArray(body.alertEmails)) {
        return res.status(400).json({
          success: false,
          message: "alertEmails must be an array of email addresses.",
        });
      }

      rawRecipients = body.alertEmails;
    } else {
      if (typeof body.alertEmail !== "string") {
        return res.status(400).json({
          success: false,
          message: "alertEmail must be a valid email address.",
        });
      }

      const legacyRecipient = body.alertEmail.trim();
      rawRecipients = legacyRecipient ? [legacyRecipient] : [];
    }

    if (rawRecipients.length > MAX_ALERT_EMAILS) {
      return res.status(400).json({
        success: false,
        message: `You can configure up to ${MAX_ALERT_EMAILS} alert email addresses.`,
      });
    }

    const normalizedRecipients = rawRecipients.map((recipient) =>
      typeof recipient === "string"
        ? recipient.trim().toLowerCase()
        : null,
    );

    const hasInvalidRecipient = normalizedRecipients.some(
      (recipient) =>
        !recipient ||
        recipient.length > 254 ||
        !EMAIL_PATTERN.test(recipient),
    );

    if (hasInvalidRecipient) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid alert email addresses.",
      });
    }

    const alertEmails = [...new Set(normalizedRecipients)];
    const primaryAlertEmail = alertEmails[0] || "";

    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          alertEmails,
          // Keep the old field in sync for existing code and stored users.
          alertEmail: primaryAlertEmail,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).select("email alertEmail alertEmails displayName");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({
      success: true,
      message: alertEmails.length
        ? "Alert notification recipients updated successfully."
        : "Alert notifications will use your account email.",
      user: {
        email: user.email,
        alertEmail: user.alertEmail || "",
        alertEmails: user.alertEmails || [],
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error("Failed to update alert email:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update alert notification email.",
    });
  }
}

async function logout(req, res) {
  const token = readCookies(req.headers.cookie)[SESSION_COOKIE];

  await authService.endSession(token);
  clearSessionCookie(res);

  return res.json({ success: true });
}

module.exports = {
  register,
  login,
  currentUser,
  updateAlertEmail,
  logout,
};