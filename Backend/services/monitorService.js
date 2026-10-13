
const dns = require("node:dns").promises;
const net = require("node:net");
const { performance } = require("node:perf_hooks");

const TIMEOUT_MS = 5000;

function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);

  if (parts.length !== 4 || parts.some(n => n < 0 || n > 255)) {
    return true;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIP(ip) {
  if (net.isIPv4(ip)) {
    return isPrivateIPv4(ip);
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();

    // Block loopback, unspecified, link-local, unique-local,
    // and IPv4-mapped IPv6 addresses.
    if (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("::ffff:")
    ) {
      return true;
    }

    return false;
  }

  return true;
}

async function validateEndpoint(address) {
  let url;

  try {
    url = new URL(address);
  } catch {
    throw new Error("Enter a valid endpoint URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP and HTTPS endpoints are allowed.");
  }

  if (url.username || url.password) {
    throw new Error("URLs containing credentials are not allowed.");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "metadata.google.internal"
  ) {
    throw new Error("Local and internal endpoints are not allowed.");
  }

  // Resolve hostnames and reject private or unsafe IP addresses.
  let addresses;

  if (net.isIP(hostname)) {
    addresses = [{ address: hostname }];
  } else {
    try {
      addresses = await dns.lookup(hostname, { all: true });
    } catch {
      throw new Error("The endpoint hostname could not be resolved.");
    }
  }

  if (
    addresses.length === 0 ||
    addresses.some(entry => isPrivateIP(entry.address))
  ) {
    throw new Error("Private or internal network addresses are not allowed.");
  }

  return url;
}

async function checkEndpoint(address) {
  try {
    const url = await validateEndpoint(address);
    const start = performance.now();

    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const latency = Math.round(performance.now() - start);

    return {
      status: "Online",
      latency,
      httpStatus: response.status,
      checkedAt: new Date().toISOString(),
      error: null,
    };
  } catch (error) {
    return {
      status: "Offline",
      latency: null,
      httpStatus: null,
      checkedAt: new Date().toISOString(),
      error: error.name === "TimeoutError" ||
        error.name === "AbortError"
        ? "Request timed out"
        : error.message,
    };
  }
}

module.exports = { checkEndpoint };
