const mongoose = require("mongoose");

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from Backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB Atlas connected successfully");
}

module.exports = { connectDatabase };
