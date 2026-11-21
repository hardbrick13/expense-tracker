import "dotenv/config";
import mongoose from "mongoose";
import os from "node:os";
import { app } from "./app.js";

const PORT = Number(process.env.PORT ?? 4000);
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from .env");
}

function lanAddresses(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i!.address);
}

async function start() {
  await mongoose.connect(MONGODB_URI!);
  console.log("✅ Connected to MongoDB");

  // Listen on all interfaces so other devices on your Wi-Fi (your iPhone) can connect
  app.listen(PORT, "0.0.0.0", (err?: Error & { code?: string }) => {
    if (err) {
      console.error(
        err.code === "EADDRINUSE"
          ? `❌ Port ${PORT} is already in use: another copy of the server is probably still running. Stop it (Ctrl+C in its terminal) and try again.`
          : `❌ Failed to start: ${err.message}`,
      );
      process.exit(1);
    }
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    for (const ip of lanAddresses()) {
      console.log(`📱 On your phone (same Wi-Fi): http://${ip}:${PORT}`);
    }
  });
}

start().catch((err) => {
  console.error("❌ Failed to start:", err);
  process.exit(1);
});
