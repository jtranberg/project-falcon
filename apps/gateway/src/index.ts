import "dotenv/config";
import { randomUUID } from "node:crypto";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import mqtt from "mqtt";
import { Server } from "socket.io";
import { z } from "zod";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const telemetrySchema = z.object({
  schemaVersion: z.number(),
  droneId: z.string().min(1),
  timestamp: z.string().datetime(),
  sequence: z.number(),
  position: z.object({
    latitude: z.number(),
    longitude: z.number(),
    altitudeM: z.number()
  }),
  motion: z.object({
    speedMps: z.number(),
    headingDeg: z.number()
  }),
  power: z.object({
    batteryPercent: z.number(),
    voltageV: z.number()
  }),
  health: z.object({
    temperatureC: z.number(),
    signalDbm: z.number(),
    gpsFix: z.boolean()
  }),
  flightMode: z.string()
});

type Telemetry = z.infer<typeof telemetrySchema>;
type Alert = { code: string; severity: string; message: string };

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const protoPath = path.resolve(currentDirectory, "../../../packages/proto/alerts.proto");
const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const descriptor = grpc.loadPackageDefinition(packageDefinition) as any;

const grpcAddress = process.env.GRPC_ALERT_ADDRESS ?? "localhost:50051";
const alertClient = new descriptor.falcon.alerts.AlertEvaluator(
  grpcAddress,
  grpc.credentials.createInsecure()
);

const mqttUrl = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const mqttTopic = process.env.MQTT_TOPIC ?? "falcon/drones/+/telemetry";
const port = Number(process.env.GATEWAY_PORT ?? 5050);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

const latestByDrone = new Map<string, Telemetry>();
const alertsByDrone = new Map<string, Alert[]>();
const lastReceivedAt = new Map<string, number>();

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
        flightMode: telemetry.flightMode
      },
      { deadline: Date.now() + 750 },
      (error: grpc.ServiceError | null, response: { alerts?: Alert[] }) => {
        if (error) {
          console.error(`Alert evaluation failed for ${telemetry.droneId}:`, error.message);
          resolve([]);
          return;
        }

        resolve(response.alerts ?? []);
      }
    );
  });
}

function fleetSnapshot() {
  return Array.from(latestByDrone.values()).map((telemetry) => ({
    telemetry,
    alerts: alertsByDrone.get(telemetry.droneId) ?? [],
    gatewayReceivedAt: new Date(lastReceivedAt.get(telemetry.droneId) ?? Date.now()).toISOString()
  }));
}

app.get("/api/health", (_request, response) => {
  response.json({
    success: true,
    service: "falcon-gateway",
    mqttUrl,
    grpcAddress,
    connectedDrones: latestByDrone.size,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/drones", (_request, response) => {
  response.json({
    success: true,
    drones: fleetSnapshot()
  });
});

io.on("connection", (socket) => {
  socket.emit("fleet:snapshot", fleetSnapshot());
});

const mqttClient = mqtt.connect(mqttUrl, {
  clientId: `falcon-gateway-${randomUUID()}`,
  reconnectPeriod: 1_000,
  clean: true
});

mqttClient.on("connect", () => {
  console.log(`Gateway connected to MQTT broker at ${mqttUrl}.`);

  mqttClient.subscribe(mqttTopic, { qos: 0 }, (error) => {
    if (error) {
      console.error("MQTT subscription failed:", error.message);
      return;
    }

    console.log(`Subscribed to ${mqttTopic}.`);
  });
});

mqttClient.on("message", async (_topic, payload) => {
  const receivedAt = Date.now();

  try {
    const telemetry = telemetrySchema.parse(JSON.parse(payload.toString()));
    const alerts = await evaluateAlerts(telemetry);

    latestByDrone.set(telemetry.droneId, telemetry);
    alertsByDrone.set(telemetry.droneId, alerts);
    lastReceivedAt.set(telemetry.droneId, receivedAt);

    io.emit("telemetry:update", {
      telemetry,
      alerts,
      gatewayReceivedAt: new Date(receivedAt).toISOString(),
      latencyMs: Math.max(0, receivedAt - Date.parse(telemetry.timestamp))
    });
  } catch (error) {
    console.error("Rejected malformed telemetry:", error);
  }
});

mqttClient.on("error", (error) => {
  console.error("MQTT gateway error:", error.message);
});

server.listen(port, () => {
  console.log(`Falcon gateway listening on http://localhost:${port}.`);
});
