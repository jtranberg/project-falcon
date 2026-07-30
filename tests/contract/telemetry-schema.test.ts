import { describe, expect, it } from "vitest";

import { DeviceModel } from "../../apps/gateway/src/models/device";
import {
  validDeviceFixture,
  validTelemetryFixture,
} from "../fixtures/device.fixture";

function createDeviceWithTelemetry(
  telemetryOverrides: Record<string, unknown> = {}
) {
  return new DeviceModel({
    ...validDeviceFixture,
    latestTelemetry: {
      ...validTelemetryFixture,
      ...telemetryOverrides,
    },
  });
}

describe("Telemetry schema contract", () => {
  it("accepts a complete valid telemetry payload", async () => {
    const device = createDeviceWithTelemetry();

    await expect(device.validate()).resolves.toBeUndefined();
  });

  it("rejects telemetry without latitude", async () => {
    const device = createDeviceWithTelemetry();

    device.latestTelemetry.latitude = undefined as never;

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        "latestTelemetry.latitude": {
          kind: "required",
        },
      },
    });
  });

  it("rejects latitude below -90", async () => {
    const device = createDeviceWithTelemetry({
      latitude: -90.1,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        "latestTelemetry.latitude": {
          kind: "min",
        },
      },
    });
  });

  it("rejects latitude above 90", async () => {
    const device = createDeviceWithTelemetry({
      latitude: 90.1,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        "latestTelemetry.latitude": {
          kind: "max",
        },
      },
    });
  });

  it("rejects longitude below -180", async () => {
    const device = createDeviceWithTelemetry({
      longitude: -180.1,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        "latestTelemetry.longitude": {
          kind: "min",
        },
      },
    });
  });

  it("rejects longitude above 180", async () => {
    const device = createDeviceWithTelemetry({
      longitude: 180.1,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        "latestTelemetry.longitude": {
          kind: "max",
        },
      },
    });
  });

  it("rejects a negative speed", async () => {
    const device = createDeviceWithTelemetry({
      speed: -0.1,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        "latestTelemetry.speed": {
          kind: "min",
        },
      },
    });
  });

  it("rejects heading below 0 degrees", async () => {
    const device = createDeviceWithTelemetry({
      heading: -1,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        "latestTelemetry.heading": {
          kind: "min",
        },
      },
    });
  });

  it("rejects heading above 360 degrees", async () => {
    const device = createDeviceWithTelemetry({
      heading: 361,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        "latestTelemetry.heading": {
          kind: "max",
        },
      },
    });
  });

  it("accepts heading boundary values", async () => {
    const zeroHeadingDevice = createDeviceWithTelemetry({
      heading: 0,
    });

    const fullHeadingDevice = createDeviceWithTelemetry({
      heading: 360,
    });

    await expect(
      zeroHeadingDevice.validate()
    ).resolves.toBeUndefined();

    await expect(
      fullHeadingDevice.validate()
    ).resolves.toBeUndefined();
  });

  it("rejects battery below 0 percent", async () => {
    const device = createDeviceWithTelemetry({
      battery: -1,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        "latestTelemetry.battery": {
          kind: "min",
        },
      },
    });
  });

  it("rejects battery above 100 percent", async () => {
    const device = createDeviceWithTelemetry({
      battery: 101,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        "latestTelemetry.battery": {
          kind: "max",
        },
      },
    });
  });

  it("accepts battery boundary values", async () => {
    const emptyBatteryDevice = createDeviceWithTelemetry({
      battery: 0,
    });

    const fullBatteryDevice = createDeviceWithTelemetry({
      battery: 100,
    });

    await expect(
      emptyBatteryDevice.validate()
    ).resolves.toBeUndefined();

    await expect(
      fullBatteryDevice.validate()
    ).resolves.toBeUndefined();
  });

  it("rejects negative voltage", async () => {
    const device = createDeviceWithTelemetry({
      voltage: -0.1,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        "latestTelemetry.voltage": {
          kind: "min",
        },
      },
    });
  });

  it("rejects telemetry without a flight mode", async () => {
    const device = createDeviceWithTelemetry({
      flightMode: undefined,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        "latestTelemetry.flightMode": {
          kind: "required",
        },
      },
    });
  });

  it("rejects telemetry without a timestamp", async () => {
    const device = createDeviceWithTelemetry({
      timestamp: undefined,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        "latestTelemetry.timestamp": {
          kind: "required",
        },
      },
    });
  });

  it("does not create a separate MongoDB id for telemetry", () => {
    const device = createDeviceWithTelemetry();

    expect(device.latestTelemetry).not.toHaveProperty("_id");
  });
});