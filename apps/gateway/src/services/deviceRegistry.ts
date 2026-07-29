export type DeviceStatus = "ONLINE" | "OFFLINE";

export type DeviceHealthState =
  | "HEALTHY"
  | "DEGRADED"
  | "CRITICAL"
  | "OFFLINE";

export interface DeviceTelemetrySnapshot {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
  battery: number;
  voltage: number;
  signalStrength: number;
  temperature: number;
  flightMode: string;
  timestamp: string;
}

export interface RegisteredDevice {
  id: string;
  name: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  owner: string;
  status: DeviceStatus;
  healthState: DeviceHealthState;
  healthScore: number;
  lastSeenAt: string;
  firstSeenAt: string;
  telemetryCount: number;
  totalFlightHours: number;
  missionsCompleted: number;
  sensors: string[];
  latestTelemetry: DeviceTelemetrySnapshot;
}

export interface RegisterTelemetryInput {
  droneId: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
  battery: number;
  voltage: number;
  signalStrength: number;
  temperature: number;
  flightMode: string;
  timestamp: string;
}

const DEFAULT_SENSORS = [
  "GPS",
  "IMU",
  "Barometer",
  "Battery Monitor",
  "Temperature Sensor",
];

const OFFLINE_AFTER_MS = 30_000;

function createSerialNumber(droneId: string): string {
  const numericId = droneId.match(/\d+/)?.[0] ?? droneId;

  return `FAL-${numericId.padStart(6, "0").toUpperCase()}`;
}

function createDeviceName(droneId: string): string {
  const suffix = droneId.match(/\d+/)?.[0] ?? droneId;

  return `Falcon ${suffix.toUpperCase()}`;
}

function calculateHealthScore(
  telemetry: RegisterTelemetryInput,
  status: DeviceStatus
): number {
  if (status === "OFFLINE") {
    return 0;
  }

  let score = 100;

  if (telemetry.battery < 15) {
    score -= 40;
  } else if (telemetry.battery < 30) {
    score -= 20;
  }

if (telemetry.signalStrength <= -90) {
  score -= 30;
} else if (telemetry.signalStrength <= -75) {
  score -= 15;
}

  if (telemetry.temperature >= 85) {
    score -= 30;
  } else if (telemetry.temperature >= 70) {
    score -= 15;
  }

  if (telemetry.voltage < 10.5) {
    score -= 20;
  } else if (telemetry.voltage < 11.2) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function determineHealthState(
  healthScore: number,
  status: DeviceStatus
): DeviceHealthState {
  if (status === "OFFLINE") {
    return "OFFLINE";
  }

  if (healthScore >= 80) {
    return "HEALTHY";
  }

  if (healthScore >= 50) {
    return "DEGRADED";
  }

  return "CRITICAL";
}

export class DeviceRegistry {
  private readonly devices = new Map<string, RegisteredDevice>();

  registerTelemetry(input: RegisterTelemetryInput): RegisteredDevice {
    const now = input.timestamp || new Date().toISOString();
    const existingDevice = this.devices.get(input.droneId);
    const status: DeviceStatus = "ONLINE";
    const healthScore = calculateHealthScore(input, status);
    const healthState = determineHealthState(healthScore, status);

    const latestTelemetry: DeviceTelemetrySnapshot = {
      latitude: input.latitude,
      longitude: input.longitude,
      altitude: input.altitude,
      speed: input.speed,
      heading: input.heading,
      battery: input.battery,
      voltage: input.voltage,
      signalStrength: input.signalStrength,
      temperature: input.temperature,
      flightMode: input.flightMode,
      timestamp: now,
    };

    const device: RegisteredDevice = {
      id: input.droneId,
      name: existingDevice?.name ?? createDeviceName(input.droneId),
      serialNumber:
        existingDevice?.serialNumber ?? createSerialNumber(input.droneId),
      manufacturer: existingDevice?.manufacturer ?? "Project Falcon",
      model: existingDevice?.model ?? "Falcon X4",
      firmwareVersion: existingDevice?.firmwareVersion ?? "1.0.0",
      owner: existingDevice?.owner ?? "Mission Control",
      status,
      healthState,
      healthScore,
      firstSeenAt: existingDevice?.firstSeenAt ?? now,
      lastSeenAt: now,
      telemetryCount: (existingDevice?.telemetryCount ?? 0) + 1,
      totalFlightHours: existingDevice?.totalFlightHours ?? 0,
      missionsCompleted: existingDevice?.missionsCompleted ?? 0,
      sensors: existingDevice?.sensors ?? DEFAULT_SENSORS,
      latestTelemetry,
    };

    this.devices.set(device.id, device);

    return device;
  }

  getAllDevices(): RegisteredDevice[] {
    this.refreshConnectionStatuses();

    return [...this.devices.values()].sort((first, second) =>
      first.name.localeCompare(second.name)
    );
  }

  getDeviceById(deviceId: string): RegisteredDevice | undefined {
    this.refreshConnectionStatuses();

    return this.devices.get(deviceId);
  }

  updateDevice(
    deviceId: string,
    updates: Partial<
      Pick<
        RegisteredDevice,
        | "name"
        | "manufacturer"
        | "model"
        | "firmwareVersion"
        | "owner"
        | "totalFlightHours"
        | "missionsCompleted"
        | "sensors"
      >
    >
  ): RegisteredDevice | undefined {
    const existingDevice = this.devices.get(deviceId);

    if (!existingDevice) {
      return undefined;
    }

    const updatedDevice: RegisteredDevice = {
      ...existingDevice,
      ...updates,
      id: existingDevice.id,
      serialNumber: existingDevice.serialNumber,
      firstSeenAt: existingDevice.firstSeenAt,
      lastSeenAt: existingDevice.lastSeenAt,
      latestTelemetry: existingDevice.latestTelemetry,
    };

    this.devices.set(deviceId, updatedDevice);

    return updatedDevice;
  }

  deleteDevice(deviceId: string): boolean {
    return this.devices.delete(deviceId);
  }

  getSummary() {
    this.refreshConnectionStatuses();

    const devices = [...this.devices.values()];

    return {
      total: devices.length,
      online: devices.filter((device) => device.status === "ONLINE").length,
      offline: devices.filter((device) => device.status === "OFFLINE").length,
      healthy: devices.filter((device) => device.healthState === "HEALTHY")
        .length,
      degraded: devices.filter((device) => device.healthState === "DEGRADED")
        .length,
      critical: devices.filter((device) => device.healthState === "CRITICAL")
        .length,
    };
  }

  refreshConnectionStatuses(currentTime = Date.now()): void {
    for (const [deviceId, device] of this.devices.entries()) {
      const lastSeenTime = new Date(device.lastSeenAt).getTime();
      const isOffline = currentTime - lastSeenTime > OFFLINE_AFTER_MS;

      if (!isOffline || device.status === "OFFLINE") {
        continue;
      }

      this.devices.set(deviceId, {
        ...device,
        status: "OFFLINE",
        healthState: "OFFLINE",
        healthScore: 0,
      });
    }
  }
}

export const deviceRegistry = new DeviceRegistry();