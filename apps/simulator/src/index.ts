import "dotenv/config";

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import mqtt from "mqtt";

type DroneState = {
  id: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  speedMps: number;
  headingDeg: number;
  batteryPercent: number;
  temperatureC: number;
  signalDbm: number;
  flightMode: "TAKEOFF" | "MISSION" | "RETURN_TO_HOME" | "LANDING";
};

const mqttUrl = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const mqttUsername = process.env.MQTT_USERNAME;
const mqttPassword = process.env.MQTT_PASSWORD;

const droneCount = Number(process.env.SIMULATOR_DRONES ?? 4);
const intervalMs = Number(process.env.SIMULATOR_INTERVAL_MS ?? 500);
const port = Number(process.env.PORT ?? 10000);

if (!Number.isFinite(droneCount) || droneCount < 1) {
  throw new Error("SIMULATOR_DRONES must be a positive number.");
}

if (!Number.isFinite(intervalMs) || intervalMs < 100) {
  throw new Error("SIMULATOR_INTERVAL_MS must be at least 100.");
}

if (mqttUrl.startsWith("mqtts://") && (!mqttUsername || !mqttPassword)) {
  throw new Error(
    "MQTT_USERNAME and MQTT_PASSWORD are required for a TLS MQTT connection."
  );
}

const client = mqtt.connect(mqttUrl, {
  clientId: `falcon-drone-client-${randomUUID()}`,
  username: mqttUsername,
  password: mqttPassword,
  reconnectPeriod: 1_000,
  clean: true,
});

const server = createServer((_request, response) => {
  const body = JSON.stringify({
    success: true,
    service: "falcon-drone-client",
    mqttConnected: client.connected,
    drones: droneCount,
    intervalMs,
    timestamp: new Date().toISOString(),
  });

  response.writeHead(client.connected ? 200 : 503, {
    "Content-Type": "application/json",
  });

  response.end(body);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Drone Client health endpoint listening on port ${port}.`);
});

const drones: DroneState[] = Array.from({ length: droneCount }, (_, index) => ({
  id: `falcon-${String(index + 1).padStart(2, "0")}`,
  latitude: 48.4284 + index * 0.004,
  longitude: -123.3656 - index * 0.004,
  altitudeM: 60 + index * 15,
  speedMps: 12 + index,
  headingDeg: index * 45,
  batteryPercent: 100 - index * 4,
  temperatureC: 36 + index,
  signalDbm: -52 - index * 3,
  flightMode: "MISSION",
}));

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nextTelemetry(drone: DroneState) {
  drone.headingDeg = (drone.headingDeg + Math.random() * 8 - 4 + 360) % 360;
  drone.speedMps = clamp(drone.speedMps + Math.random() * 1.2 - 0.6, 0, 28);
  drone.altitudeM = clamp(drone.altitudeM + Math.random() * 4 - 2, 5, 180);
  drone.temperatureC = clamp(
    drone.temperatureC + Math.random() * 0.6 - 0.3,
    20,
    85
  );
  drone.signalDbm = clamp(
    drone.signalDbm + Math.random() * 4 - 2,
    -110,
    -35
  );
  drone.batteryPercent = clamp(
    drone.batteryPercent - Math.random() * 0.06,
    0,
    100
  );

  const distanceKm = (drone.speedMps * intervalMs) / 1_000 / 1_000;
  const headingRad = (drone.headingDeg * Math.PI) / 180;

  drone.latitude += (distanceKm / 111) * Math.cos(headingRad);
  drone.longitude +=
    (distanceKm /
      (111 * Math.cos((drone.latitude * Math.PI) / 180))) *
    Math.sin(headingRad);

  if (drone.batteryPercent < 18) {
    drone.flightMode = "RETURN_TO_HOME";
  } else if (drone.altitudeM < 12) {
    drone.flightMode = "TAKEOFF";
  } else {
    drone.flightMode = "MISSION";
  }

  return {
    schemaVersion: 1,
    droneId: drone.id,
    timestamp: new Date().toISOString(),
    sequence: Date.now(),
    position: {
      latitude: Number(drone.latitude.toFixed(6)),
      longitude: Number(drone.longitude.toFixed(6)),
      altitudeM: Number(drone.altitudeM.toFixed(2)),
    },
    motion: {
      speedMps: Number(drone.speedMps.toFixed(2)),
      headingDeg: Number(drone.headingDeg.toFixed(2)),
    },
    power: {
      batteryPercent: Number(drone.batteryPercent.toFixed(2)),
      voltageV: Number((19.2 + drone.batteryPercent * 0.048).toFixed(2)),
    },
    health: {
      temperatureC: Number(drone.temperatureC.toFixed(2)),
      signalDbm: Number(drone.signalDbm.toFixed(2)),
      gpsFix: true,
    },
    flightMode: drone.flightMode,
  };
}

client.on("connect", () => {
  console.log(
    `Drone Client connected to ${mqttUrl}. Publishing ${droneCount} drones every ${intervalMs} ms.`
  );

  setInterval(() => {
    for (const drone of drones) {
      const telemetry = nextTelemetry(drone);

      client.publish(
        `falcon/drones/${drone.id}/telemetry`,
        JSON.stringify(telemetry),
        {
          qos: 0,
          retain: false,
        }
      );
    }
  }, intervalMs);
});

client.on("error", (error) => {
  console.error("MQTT Drone Client error:", error);
});

client.on("offline", () => {
  console.log("MQTT client offline");
});

client.on("reconnect", () => {
  console.log("MQTT reconnecting...");
});

client.on("close", () => {
  console.log("MQTT connection closed");
});