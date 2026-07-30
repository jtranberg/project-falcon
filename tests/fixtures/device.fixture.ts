export const validTelemetryFixture = {
  latitude: 48.4284,
  longitude: -123.3656,
  altitude: 125.5,
  speed: 18.4,
  heading: 245,
  battery: 87,
  voltage: 15.8,
  signalStrength: -62,
  temperature: 31.4,
  flightMode: "STANDBY",
  timestamp: "2026-07-29T23:00:00.000Z",
};

export const validDeviceFixture = {
  deviceId: "FALCON-001",
  name: "Falcon Test Aircraft",
  serialNumber: "SN-FALCON-001",
  manufacturer: "Falcon Aerospace",
  model: "Falcon X1",
  firmwareVersion: "1.0.0",
  owner: "Project Falcon",

  status: "ONLINE",
  healthState: "HEALTHY",
  healthScore: 100,

  lastSeenAt: "2026-07-29T23:00:00.000Z",
  firstSeenAt: "2026-07-29T22:00:00.000Z",

  telemetryCount: 1,
  totalFlightHours: 0,
  missionsCompleted: 0,

  sensors: [
    "GPS",
    "ALTIMETER",
    "BATTERY",
    "TEMPERATURE",
  ],

  latestTelemetry: validTelemetryFixture,
};