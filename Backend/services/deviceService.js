const { randomUUID } = require("node:crypto");
const Device = require("../models/Device");
const { validateEndpoint } = require("./monitorService");

function validateDeviceDetails({ name, address, type }) {
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof address !== "string" ||
    !address.trim() ||
    address.trim().length > 2048 ||
    (type !== undefined && (typeof type !== "string" || type.trim().length > 60))
  ) {
    const error = new Error("Device name, address, or type is invalid");
    error.statusCode = 400;
    throw error;
  }
  return {
    name: name.trim(),
    address: address.trim(),
    type: typeof type === "string" && type.trim() ? type.trim() : "Custom Endpoint",
  };
}

async function createDevice(input, ownerId) {
  const details = validateDeviceDetails(input);
  try {
    await validateEndpoint(details.address);
  } catch (error) {
    error.statusCode = 400;
    throw error;
  }
  try {
    return await Device.create({
      id: randomUUID(),
      ownerId,
      ...details,
      status: "Unknown",
      latency: null,
      httpStatus: null,
      checkedAt: null,
      error: null,
    });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = "A monitor with this ID already exists";
    }
    throw error;
  }
}

async function updateDevice(id, input, ownerId) {
  const details = validateDeviceDetails(input);
  try {
    await validateEndpoint(details.address);
  } catch (error) {
    error.statusCode = 400;
    throw error;
  }
  return Device.findOneAndUpdate(
    { id, ownerId },
    { $set: details },
    { returnDocument: "after", runValidators: true },
  );
}

module.exports = { validateDeviceDetails, createDevice, updateDevice };
