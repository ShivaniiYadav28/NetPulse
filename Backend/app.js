const express = require("express");
const cors = require("cors");

const deviceRoutes = require("./routes/deviceRoutes");
const healthRoutes = require("./routes/healthRoutes");
const incidentRoutes = require("./routes/incidentRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const alertRoutes = require("./routes/alertRoutes");
const authRoutes = require("./routes/authRoutes");
const { authenticate, csrfProtection } = require("./middleware/authMiddleware");

const { errorHandler, notFoundHandler } = require("./middleware/errorMiddleware");

const app = express();
const frontendOrigin = (process.env.FRONTEND_URL || "http://localhost:5173").replace(
  /\/$/,
  "",
);

// Middleware
app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use(express.json({ limit: "1mb" }));

// Root endpoint
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "NetPulse API is running",
    status: "success",
  });
});

// Health endpoint
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);

// Application data APIs require an authenticated, CSRF-protected session.
app.use("/api/devices", authenticate, csrfProtection, deviceRoutes);
app.use("/api/incidents", authenticate, csrfProtection, incidentRoutes);
app.use("/api/analytics", authenticate, csrfProtection, analyticsRoutes);
app.use("/api/alerts", authenticate, csrfProtection, alertRoutes);

// Handle unknown routes
app.use(notFoundHandler);

// Centralized error handling (keep this last)
app.use(errorHandler);

module.exports = app;
