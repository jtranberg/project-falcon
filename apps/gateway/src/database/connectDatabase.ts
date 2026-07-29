import mongoose from "mongoose";

let databaseConnected = false;

export function isDatabaseConnected(): boolean {
  return databaseConnected;
}

export async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  mongoose.connection.on("connected", () => {
    databaseConnected = true;
    console.log("MongoDB connected.");
  });

  mongoose.connection.on("disconnected", () => {
    databaseConnected = false;
    console.warn("MongoDB disconnected.");
  });

  mongoose.connection.on("error", (error) => {
    databaseConnected = false;
    console.error("MongoDB connection error:", error);
  });

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10_000
  });
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  databaseConnected = false;
}