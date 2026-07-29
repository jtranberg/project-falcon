import {
  DeviceModel,
  type DeviceRecord,
} from "../models/Device.js";

export interface PersistedDeviceInput {
  id: string;
  name: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  owner: string;
  status: "ONLINE" | "OFFLINE";
  healthState: "HEALTHY" | "DEGRADED" | "CRITICAL" | "OFFLINE";
  healthScore: number;
  lastSeenAt: string;
  firstSeenAt: string;
  telemetryCount: number;
  totalFlightHours: number;
  missionsCompleted: number;
  sensors: string[];
  latestTelemetry: {
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
  };
}

export interface DeviceProfileUpdate {
  name?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  owner?: string;
  totalFlightHours?: number;
  missionsCompleted?: number;
  sensors?: string[];
}

function toDatabaseDevice(device: PersistedDeviceInput) {
  return {
    deviceId: device.id,
    name: device.name,
    serialNumber: device.serialNumber,
    manufacturer: device.manufacturer,
    model: device.model,
    firmwareVersion: device.firmwareVersion,
    owner: device.owner,
    status: device.status,
    healthState: device.healthState,
    healthScore: device.healthScore,
    lastSeenAt: device.lastSeenAt,
    firstSeenAt: device.firstSeenAt,
    telemetryCount: device.telemetryCount,
    totalFlightHours: device.totalFlightHours,
    missionsCompleted: device.missionsCompleted,
    sensors: device.sensors,
    latestTelemetry: device.latestTelemetry,
  };
}

export async function findAllDevices(): Promise<DeviceRecord[]> {
  return DeviceModel.find()
    .sort({
      name: 1,
      deviceId: 1,
    })
    .lean()
    .exec();
}

export async function findDeviceById(
  deviceId: string
): Promise<DeviceRecord | null> {
  return DeviceModel.findOne({
    deviceId,
  })
    .lean()
    .exec();
}

export async function saveDevice(
  device: PersistedDeviceInput
): Promise<DeviceRecord> {
  const savedDevice = await DeviceModel.findOneAndUpdate(
    {
      deviceId: device.id,
    },
    {
      $set: toDatabaseDevice(device),
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  )
    .lean()
    .exec();

  if (!savedDevice) {
    throw new Error(`Unable to persist device ${device.id}.`);
  }

  return savedDevice;
}

export async function updateDeviceProfile(
  deviceId: string,
  updates: DeviceProfileUpdate
): Promise<DeviceRecord | null> {
  return DeviceModel.findOneAndUpdate(
    {
      deviceId,
    },
    {
      $set: updates,
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  )
    .lean()
    .exec();
}

export async function updatePersistedDeviceStatus(
  deviceId: string,
  status: "ONLINE" | "OFFLINE",
  healthState: "HEALTHY" | "DEGRADED" | "CRITICAL" | "OFFLINE",
  healthScore: number
): Promise<DeviceRecord | null> {
  return DeviceModel.findOneAndUpdate(
    {
      deviceId,
    },
    {
      $set: {
        status,
        healthState,
        healthScore,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  )
    .lean()
    .exec();
}

export async function deleteDeviceById(
  deviceId: string
): Promise<boolean> {
  const result = await DeviceModel.deleteOne({
    deviceId,
  }).exec();

  return result.deletedCount === 1;
}