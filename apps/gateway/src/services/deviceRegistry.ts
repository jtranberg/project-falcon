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

import type { DeviceRecord } from "../models/Device.js";

import {
  deleteDeviceById,
  findAllDevices,
  saveDevice,
  updateDeviceProfile,
  updatePersistedDeviceStatus,
} from "../repositories/deviceRepository.js";

const DEFAULT_SENSORS = [
  "GPS",
  "IMU",
  "Barometer",
  "Battery Monitor",
  "Temperature Sensor",
];

const OFFLINE_AFTER_MS = 30_000;

const DEVICE_PERSIST_INTERVAL_MS = Number(
  process.env.DEVICE_PERSIST_INTERVAL_MS ?? 10_000
);

if (
  !Number.isFinite(DEVICE_PERSIST_INTERVAL_MS) ||
  DEVICE_PERSIST_INTERVAL_MS < 1_000
) {
  throw new Error(
    "DEVICE_PERSIST_INTERVAL_MS must be a number of at least 1000."
  );
}

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

  /**
   * Tracks the most recent successful or scheduled persistence time
   * for each device.
   */
  private readonly lastPersistedAt = new Map<string, number>();

  /**
   * Prevents overlapping MongoDB writes for the same device.
   */
  private readonly persistenceInProgress = new Set<string>();

  async hydrateFromDatabase(): Promise<number> {
    const persistedDevices = await findAllDevices();

    this.devices.clear();
    this.lastPersistedAt.clear();
    this.persistenceInProgress.clear();

    for (const persistedDevice of persistedDevices) {
      const device = this.fromDatabaseRecord(persistedDevice);

      this.devices.set(device.id, device);
    }

    this.refreshConnectionStatuses();

    return this.devices.size;
  }

  private fromDatabaseRecord(record: DeviceRecord): RegisteredDevice {
    return {
      id: record.deviceId,
      name: record.name,
      serialNumber: record.serialNumber,
      manufacturer: record.manufacturer,
      model: record.model,
      firmwareVersion: record.firmwareVersion,
      owner: record.owner,
      status: record.status,
      healthState: record.healthState,
      healthScore: record.healthScore,
      lastSeenAt: record.lastSeenAt,
      firstSeenAt: record.firstSeenAt,
      telemetryCount: record.telemetryCount,
      totalFlightHours: record.totalFlightHours,
      missionsCompleted: record.missionsCompleted,
      sensors: [...record.sensors],

      latestTelemetry: {
        latitude: record.latestTelemetry.latitude,
        longitude: record.latestTelemetry.longitude,
        altitude: record.latestTelemetry.altitude,
        speed: record.latestTelemetry.speed,
        heading: record.latestTelemetry.heading,
        battery: record.latestTelemetry.battery,
        voltage: record.latestTelemetry.voltage,
        signalStrength: record.latestTelemetry.signalStrength,
        temperature: record.latestTelemetry.temperature,
        flightMode: record.latestTelemetry.flightMode,
        timestamp: record.latestTelemetry.timestamp,
      },
    };
  }

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
      sensors: existingDevice?.sensors ?? [...DEFAULT_SENSORS],
      latestTelemetry,
    };

    this.devices.set(device.id, device);

    this.persistDeviceIfDue(device);

    return device;
  }

  private persistDeviceIfDue(device: RegisteredDevice): void {
    const currentTime = Date.now();
    const previousPersistedAt =
      this.lastPersistedAt.get(device.id) ?? 0;

    const persistenceIsDue =
      currentTime - previousPersistedAt >= DEVICE_PERSIST_INTERVAL_MS;

    if (!persistenceIsDue) {
      return;
    }

    if (this.persistenceInProgress.has(device.id)) {
      return;
    }

    /*
     * Record the time before starting the asynchronous operation so that
     * telemetry received while the write is in progress does not start
     * duplicate MongoDB writes.
     */
    this.lastPersistedAt.set(device.id, currentTime);
    this.persistenceInProgress.add(device.id);

    void saveDevice(device)
      .catch((error: unknown) => {
        /*
         * Remove the timestamp after a failure so the next telemetry event
         * can retry immediately rather than waiting another ten seconds.
         */
        this.lastPersistedAt.delete(device.id);

        console.error(
          `Unable to persist telemetry for device ${device.id}:`,
          error
        );
      })
      .finally(() => {
        this.persistenceInProgress.delete(device.id);
      });
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

    /*
     * Profile edits are deliberate user actions, so they are persisted
     * immediately rather than waiting for the telemetry throttle.
     */
    void updateDeviceProfile(deviceId, updates).catch((error: unknown) => {
      console.error(
        `Unable to persist profile updates for device ${deviceId}:`,
        error
      );
    });

    return updatedDevice;
  }

  deleteDevice(deviceId: string): boolean {
    const deletedFromRegistry = this.devices.delete(deviceId);

    if (!deletedFromRegistry) {
      return false;
    }

    this.lastPersistedAt.delete(deviceId);
    this.persistenceInProgress.delete(deviceId);

    void deleteDeviceById(deviceId).catch((error: unknown) => {
      console.error(
        `Unable to delete persisted device ${deviceId}:`,
        error
      );
    });

    return true;
  }

  getSummary() {
    this.refreshConnectionStatuses();

    const devices = [...this.devices.values()];

    return {
      total: devices.length,
      online: devices.filter((device) => device.status === "ONLINE").length,
      offline: devices.filter((device) => device.status === "OFFLINE").length,
      healthy: devices.filter(
        (device) => device.healthState === "HEALTHY"
      ).length,
      degraded: devices.filter(
        (device) => device.healthState === "DEGRADED"
      ).length,
      critical: devices.filter(
        (device) => device.healthState === "CRITICAL"
      ).length,
    };
  }

  refreshConnectionStatuses(currentTime = Date.now()): void {
    for (const [deviceId, device] of this.devices.entries()) {
      const lastSeenTime = new Date(device.lastSeenAt).getTime();
      const isOffline = currentTime - lastSeenTime > OFFLINE_AFTER_MS;

      if (!isOffline || device.status === "OFFLINE") {
        continue;
      }

      const offlineDevice: RegisteredDevice = {
        ...device,
        status: "OFFLINE",
        healthState: "OFFLINE",
        healthScore: 0,
      };

      this.devices.set(deviceId, offlineDevice);

      /*
       * Offline state changes are operationally meaningful, so they are
       * persisted immediately.
       */
      void updatePersistedDeviceStatus(
        deviceId,
        "OFFLINE",
        "OFFLINE",
        0
      ).catch((error: unknown) => {
        console.error(
          `Unable to persist offline status for device ${deviceId}:`,
          error
        );
      });
    }
  }
}

export const deviceRegistry = new DeviceRegistry();