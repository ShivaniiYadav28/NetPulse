const express = require("express");
const cors = require("cors");

const deviceRoutes = require("./routes/deviceRoutes");
const healthRoutes = require("./routes/healthRoutes");
const incidentRoutes = require("./routes/incidentRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const {
  errorHandler,
  notFoundHandler,
} = require("./middleware/errorMiddleware");

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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

// Device management and monitoring endpoints
app.use("/api/devices", deviceRoutes);

// Incident tracking endpoints
app.use("/api/incidents", incidentRoutes);

// Analytics endpoints
app.use("/api/analytics", analyticsRoutes);

// Handle unknown routes
app.use(notFoundHandler);

// Centralized error handling (keep this last)
app.use(errorHandler);

module.exports = app;
