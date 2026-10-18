const mongoose = require("mongoose");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
      index: true,
    },

    // Legacy single alert address. Kept for compatibility.
    alertEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
      validate: {
        validator: function (value) {
          if (!value) return true;
          return EMAIL_PATTERN.test(value);
        },
        message: "Please provide a valid alert email address.",
      },
    },

    // All addresses that should receive alert notifications.
    alertEmails: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          maxlength: 254,
          match: EMAIL_PATTERN,
        },
      ],
      default: [],
      validate: {
        validator: function (values) {
          return Array.isArray(values) && values.length <= 10;
        },
        message: "You can configure up to 10 alert email addresses.",
      },
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);