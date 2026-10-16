const buckets = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function authRateLimit(req, res, next) {
  const now = Date.now();
  const key = `${req.baseUrl}${req.path}:${req.ip}`;
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (buckets.size > 10000) {
    for (const [entry, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(entry);
    }
    if (buckets.size > 10000) {
      buckets.delete(buckets.keys().next().value);
    }
  }
  res.setHeader("RateLimit-Limit", MAX_ATTEMPTS);
  res.setHeader("RateLimit-Remaining", Math.max(0, MAX_ATTEMPTS - bucket.count));
  if (bucket.count > MAX_ATTEMPTS) {
    res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
    return res
      .status(429)
      .json({ success: false, message: "Too many authentication attempts" });
  }
  return next();
}

module.exports = { authRateLimit };
