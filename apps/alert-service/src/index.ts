import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

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
const address = process.env.GRPC_ALERT_ADDRESS ?? "0.0.0.0:50051";

function evaluateTelemetry(call: any, callback: any): void {
  const telemetry = call.request;
  const alerts: Array<{ code: string; severity: string; message: string }> = [];

  if (telemetry.batteryPercent <= 15) {
    alerts.push({
      code: "BATTERY_CRITICAL",
      severity: "CRITICAL",
      message: `${telemetry.droneId} battery is ${telemetry.batteryPercent.toFixed(1)}%.`
    });
  } else if (telemetry.batteryPercent <= 25) {
    alerts.push({
      code: "BATTERY_LOW",
      severity: "WARNING",
      message: `${telemetry.droneId} battery is ${telemetry.batteryPercent.toFixed(1)}%.`
    });
  }

  if (telemetry.temperatureC >= 75) {
    alerts.push({
      code: "TEMPERATURE_HIGH",
      severity: "CRITICAL",
      message: `${telemetry.droneId} temperature is ${telemetry.temperatureC.toFixed(1)} C.`
    });
  } else if (telemetry.temperatureC >= 60) {
    alerts.push({
      code: "TEMPERATURE_ELEVATED",
      severity: "WARNING",
      message: `${telemetry.droneId} temperature is ${telemetry.temperatureC.toFixed(1)} C.`
    });
  }

  if (telemetry.signalDbm <= -100) {
    alerts.push({
      code: "SIGNAL_CRITICAL",
      severity: "CRITICAL",
      message: `${telemetry.droneId} signal is ${telemetry.signalDbm.toFixed(0)} dBm.`
    });
  } else if (telemetry.signalDbm <= -85) {
    alerts.push({
      code: "SIGNAL_WEAK",
      severity: "WARNING",
      message: `${telemetry.droneId} signal is ${telemetry.signalDbm.toFixed(0)} dBm.`
    });
  }

  callback(null, { alerts });
}

const server = new grpc.Server();
server.addService(descriptor.falcon.alerts.AlertEvaluator.service, {
  evaluateTelemetry
});

server.bindAsync(
  address,
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    if (error) {
      console.error("Failed to start gRPC alert service:", error);
      process.exit(1);
    }

    console.log(`Alert service listening on ${address} (port ${port}).`);
  }
);
