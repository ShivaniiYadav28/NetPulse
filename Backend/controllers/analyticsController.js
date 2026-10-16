const analyticsService = require("../services/analyticsService");

const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function parseDateRange(query) {
  const to = query.to === undefined ? new Date() : new Date(query.to);
  const from =
    query.from === undefined
      ? new Date(to.getTime() - DEFAULT_WINDOW_MS)
      : new Date(query.from);
  if (
    (query.from !== undefined && !Number.isFinite(from.getTime())) ||
    (query.to !== undefined && !Number.isFinite(to.getTime()))
  ) {
    return { error: "from and to must be valid dates" };
  }

  if (from > to) {
    return { error: "from must be earlier than or equal to to" };
  }

  return { from, to };
}
function pageParam(value, fallback, name, maximum) {
  if (value === undefined) {
    return { value: fallback };
  }

  if (
    !/^\d+$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1
  ) {
    return { error: `${name} must be a positive integer` };
  }

  return { value: maximum ? Math.min(Number(value), maximum) : Number(value) };
}
function validDeviceId(id) {
  return typeof id === "string" && id.trim().length > 0 && id.length <= 128;
}

async function getOverview(req, res) {
  const range = parseDateRange(req.query);
  if (range.error) {
    return fail(res, 400, range.error);
  }

  try {
    const data = await analyticsService.getOverview(req.user.id, range);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get analytics overview error:", error.message);
    return fail(res, 500, "Failed to retrieve analytics overview");
  }
}
async function getDeviceAnalytics(req, res) {
  if (!validDeviceId(req.params.id)) {
    return fail(res, 400, "Device ID is invalid");
  }

  const range = parseDateRange(req.query);
  if (range.error) {
    return fail(res, 400, range.error);
  }

  try {
    const data = await analyticsService.getDeviceAnalytics(
      req.params.id,
      req.user.id,
      range,
    );
    if (!data) {
      return fail(res, 404, "Device not found");
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get device analytics error:", error.message);
    return fail(res, 500, "Failed to retrieve device analytics");
  }
}
async function getDeviceHistory(req, res) {
  if (!validDeviceId(req.params.id)) {
    return fail(res, 400, "Device ID is invalid");
  }

  const range = parseDateRange(req.query);
  if (range.error) {
    return fail(res, 400, range.error);
  }

  const page = pageParam(req.query.page, 1, "page");
  if (page.error) {
    return fail(res, 400, page.error);
  }

  const limit = pageParam(req.query.limit, DEFAULT_PAGE_SIZE, "limit", MAX_PAGE_SIZE);
  if (limit.error) {
    return fail(res, 400, limit.error);
  }

  try {
    const data = await analyticsService.getDeviceHistory(
      req.params.id,
      req.user.id,
      range,
      page.value,
      limit.value,
    );
    if (!data) {
      return fail(res, 404, "Device not found");
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get device analytics history error:", error.message);
    return fail(res, 500, "Failed to retrieve device history");
  }
}

module.exports = { getOverview, getDeviceAnalytics, getDeviceHistory };
