import "dotenv/config";

import { randomUUID } from "node:crypto";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import cors from "cors";
import express from "express";
import mqtt from "mqtt";
import { Server } from "socket.io";
import { z } from "zod";

import {
  deviceRegistry,
  type RegisteredDevice,
} from "./services/deviceRegistry.js";

import {
  connectDatabase,
  disconnectDatabase,
} from "./database/connectDatabase.js";

const telemetrySchema = z.object({
  schemaVersion: z.number(),
  droneId: z.string().min(1),
  timestamp: z.string().datetime(),
  sequence: z.number(),

  position: z.object({
    latitude: z.number(),
    longitude: z.number(),
    altitudeM: z.number(),
  }),

  motion: z.object({
    speedMps: z.number(),
    headingDeg: z.number(),
  }),

  power: z.object({
    batteryPercent: z.number(),
    voltageV: z.number(),
  }),

  health: z.object({
    temperatureC: z.number(),
    signalDbm: z.number(),
    gpsFix: z.boolean(),
  }),

  flightMode: z.string(),
});

const updateDeviceSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    manufacturer: z.string().trim().min(1).max(100).optional(),
    model: z.string().trim().min(1).max(100).optional(),
    firmwareVersion: z.string().trim().min(1).max(50).optional(),
    owner: z.string().trim().min(1).max(100).optional(),
    totalFlightHours: z.number().min(0).optional(),
    missionsCompleted: z.number().int().min(0).optional(),
    sensors: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

type Telemetry = z.infer<typeof telemetrySchema>;

type Alert = {
  code: string;
  severity: string;
  message: string;
};

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const protoPath = path.resolve(
  currentDirectory,
  "../../../packages/proto/alerts.proto",
);

const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const descriptor = grpc.loadPackageDefinition(packageDefinition) as any;

const grpcAddress = process.env.GRPC_ALERT_ADDRESS ?? "localhost:50051";

const alertClient = new descriptor.falcon.alerts.AlertEvaluator(
  grpcAddress,
  grpc.credentials.createInsecure(),
);

const mqttUrl = process.env.MQTT_URL ?? "mqtt://localhost:1883";

const mqttTopic = process.env.MQTT_TOPIC ?? "falcon/drones/+/telemetry";

const port = Number(process.env.GATEWAY_PORT ?? 5050);

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

const latestByDrone = new Map<string, Telemetry>();
const alertsByDrone = new Map<string, Alert[]>();
const lastReceivedAt = new Map<string, number>();

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    const hydratedDeviceCount =
      await deviceRegistry.hydrateFromDatabase();

    console.log(
      `Loaded ${hydratedDeviceCount} device(s) from MongoDB.`
    );

    server.listen(port, () => {
      console.log(`Falcon gateway listening on port ${port}.`);
    });
  } catch (error) {
    console.error("Unable to start Falcon gateway:", error);
    process.exit(1);
  }
}

void startServer();

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received. Shutting down Falcon gateway.`);

  clearInterval(registryStatusInterval);

  mqttClient.end(true);
  alertClient.close();

  io.close(() => {
    server.close(async (error) => {
      if (error) {
        console.error("Gateway shutdown failed:", error);
        process.exit(1);
      }

      await disconnectDatabase();

      process.exit(0);
    });
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

function evaluateAlerts(telemetry: Telemetry): Promise<Alert[]> {
  return new Promise((resolve) => {
    alertClient.evaluateTelemetry(
      {
        droneId: telemetry.droneId,
        timestampMs: Date.parse(telemetry.timestamp),
        batteryPercent: telemetry.power.batteryPercent,
        altitudeM: telemetry.position.altitudeM,
        speedMps: telemetry.motion.speedMps,
        latitude: telemetry.position.latitude,
        longitude: telemetry.position.longitude,
        temperatureC: telemetry.health.temperatureC,
        signalDbm: telemetry.health.signalDbm,
        flightMode: telemetry.flightMode,
      },
      {
        deadline: Date.now() + 750,
      },
      (error: grpc.ServiceError | null, response: { alerts?: Alert[] }) => {
        if (error) {
          console.error(
            `Alert evaluation failed for ${telemetry.droneId}:`,
            error.message,
          );

          resolve([]);
          return;
        }

        resolve(response.alerts ?? []);
      },
    );
  });
}

function fleetSnapshot() {
  return Array.from(latestByDrone.values()).map((telemetry) => ({
    telemetry,
    alerts: alertsByDrone.get(telemetry.droneId) ?? [],
    gatewayReceivedAt: new Date(
      lastReceivedAt.get(telemetry.droneId) ?? Date.now(),
    ).toISOString(),
  }));
}

function broadcastRegistryUpdate(device: RegisteredDevice): void {
  io.emit("device:updated", {
    device,
    summary: deviceRegistry.getSummary(),
  });
}

app.get("/api/health", (_request, response) => {
  const registrySummary = deviceRegistry.getSummary();

  response.json({
    success: true,
    service: "falcon-gateway",
    mqttUrl,
    grpcAddress,
    connectedDrones: latestByDrone.size,
    registry: registrySummary,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/drones", (_request, response) => {
  response.json({
    success: true,
    drones: fleetSnapshot(),
  });
});

/**
 * ------------------------------------------------------------
 * Device Registry API
 * ------------------------------------------------------------
 */

app.get("/api/devices", (_request, response) => {
  const devices = deviceRegistry.getAllDevices();

  response.json({
    success: true,
    count: devices.length,
    summary: deviceRegistry.getSummary(),
    devices,
  });
});

app.get("/api/devices/summary", (_request, response) => {
  response.json({
    success: true,
    summary: deviceRegistry.getSummary(),
  });
});

app.get("/api/devices/:deviceId", (request, response) => {
  const device = deviceRegistry.getDeviceById(request.params.deviceId);

  if (!device) {
    response.status(404).json({
      success: false,
      message: `Device ${request.params.deviceId} was not found.`,
    });

    return;
  }

  response.json({
    success: true,
    device,
  });
});

app.patch("/api/devices/:deviceId", (request, response) => {
  const parseResult = updateDeviceSchema.safeParse(request.body);

  if (!parseResult.success) {
    response.status(400).json({
      success: false,
      message: "Invalid device update.",
      errors: parseResult.error.flatten(),
    });

    return;
  }

  const updatedDevice = deviceRegistry.updateDevice(
    request.params.deviceId,
    parseResult.data,
  );

  if (!updatedDevice) {
    response.status(404).json({
      success: false,
      message: `Device ${request.params.deviceId} was not found.`,
    });

    return;
  }

  broadcastRegistryUpdate(updatedDevice);

  response.json({
    success: true,
    device: updatedDevice,
  });
});

app.delete("/api/devices/:deviceId", (request, response) => {
  const deleted = deviceRegistry.deleteDevice(request.params.deviceId);

  if (!deleted) {
    response.status(404).json({
      success: false,
      message: `Device ${request.params.deviceId} was not found.`,
    });

    return;
  }

  latestByDrone.delete(request.params.deviceId);
  alertsByDrone.delete(request.params.deviceId);
  lastReceivedAt.delete(request.params.deviceId);

  io.emit("device:deleted", {
    deviceId: request.params.deviceId,
    summary: deviceRegistry.getSummary(),
  });

  response.json({
    success: true,
    message: `Device ${request.params.deviceId} was deleted.`,
  });
});

io.on("connection", (socket) => {
  socket.emit("fleet:snapshot", fleetSnapshot());

  socket.emit("registry:snapshot", {
    devices: deviceRegistry.getAllDevices(),
    summary: deviceRegistry.getSummary(),
  });
});

const mqttClient = mqtt.connect(mqttUrl, {
  clientId: `falcon-gateway-${randomUUID()}`,
  reconnectPeriod: 1_000,
  clean: true,
});

mqttClient.on("connect", () => {
  console.log(`Gateway connected to MQTT broker at ${mqttUrl}.`);

  mqttClient.subscribe(
    mqttTopic,
    {
      qos: 0,
    },
    (error) => {
      if (error) {
        console.error("MQTT subscription failed:", error.message);

        return;
      }

      console.log(`Subscribed to ${mqttTopic}.`);
    },
  );
});

mqttClient.on("message", async (_topic, payload) => {
  const receivedAt = Date.now();

  try {
    const telemetry = telemetrySchema.parse(JSON.parse(payload.toString()));

    const alerts = await evaluateAlerts(telemetry);

    latestByDrone.set(telemetry.droneId, telemetry);

    alertsByDrone.set(telemetry.droneId, alerts);

    lastReceivedAt.set(telemetry.droneId, receivedAt);

    const registeredDevice = deviceRegistry.registerTelemetry({
      droneId: telemetry.droneId,
      latitude: telemetry.position.latitude,
      longitude: telemetry.position.longitude,
      altitude: telemetry.position.altitudeM,
      speed: telemetry.motion.speedMps,
      heading: telemetry.motion.headingDeg,
      battery: telemetry.power.batteryPercent,
      voltage: telemetry.power.voltageV,
      signalStrength: telemetry.health.signalDbm,
      temperature: telemetry.health.temperatureC,
      flightMode: telemetry.flightMode,
      timestamp: telemetry.timestamp,
    });

    io.emit("telemetry:update", {
      telemetry,
      alerts,
      device: registeredDevice,
      gatewayReceivedAt: new Date(receivedAt).toISOString(),
      latencyMs: Math.max(0, receivedAt - Date.parse(telemetry.timestamp)),
    });

    broadcastRegistryUpdate(registeredDevice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Rejected malformed telemetry:", error.flatten());

      return;
    }

    console.error("Failed to process telemetry:", error);
  }
});

mqttClient.on("error", (error) => {
  console.error("MQTT gateway error:", error.message);
});

/**
 * Refresh device states even when no API request is made.
 *
 * This allows the registry to mark stale devices offline and broadcast
 * the updated snapshot to connected dashboards.
 */
const registryStatusInterval = setInterval(() => {
  const before = deviceRegistry.getAllDevices().map((device) => ({
    id: device.id,
    status: device.status,
  }));

  deviceRegistry.refreshConnectionStatuses();

  const devices = deviceRegistry.getAllDevices();

  const statusChanged = devices.some((device) => {
    const previous = before.find((entry) => entry.id === device.id);

    return previous?.status !== device.status;
  });

  if (statusChanged) {
    io.emit("registry:snapshot", {
      devices,
      summary: deviceRegistry.getSummary(),
    });
  }
}, 5_000);
