import { describe, expect, it } from "vitest";

import { DeviceModel } from "../../apps/gateway/src/models/device";
import { validDeviceFixture } from "../fixtures/device.fixture";

function createDevice(overrides: Record<string, unknown> = {}) {
  return new DeviceModel({
    ...validDeviceFixture,
    ...overrides,
  });
}

describe("Device schema contract", () => {
  it("accepts a complete valid device payload", async () => {
    const device = createDevice();

    await expect(device.validate()).resolves.toBeUndefined();
  });

  it("rejects a device without a deviceId", async () => {
    const device = createDevice({
      deviceId: undefined,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        deviceId: {
          kind: "required",
        },
      },
    });
  });

  it("rejects a device without a name", async () => {
    const device = createDevice({
      name: undefined,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        name: {
          kind: "required",
        },
      },
    });
  });

  it("rejects a device name longer than 100 characters", async () => {
    const device = createDevice({
      name: "A".repeat(101),
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        name: {
          kind: "maxlength",
        },
      },
    });
  });

  it("rejects a device without a serial number", async () => {
    const device = createDevice({
      serialNumber: undefined,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        serialNumber: {
          kind: "required",
        },
      },
    });
  });

  it("rejects a device without a manufacturer", async () => {
    const device = createDevice({
      manufacturer: undefined,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        manufacturer: {
          kind: "required",
        },
      },
    });
  });

  it("rejects a manufacturer longer than 100 characters", async () => {
    const device = createDevice({
      manufacturer: "A".repeat(101),
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        manufacturer: {
          kind: "maxlength",
        },
      },
    });
  });

  it("rejects a device without a model", async () => {
    const device = createDevice({
      model: undefined,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        model: {
          kind: "required",
        },
      },
    });
  });

  it("rejects a model longer than 100 characters", async () => {
    const device = createDevice({
      model: "A".repeat(101),
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        model: {
          kind: "maxlength",
        },
      },
    });
  });

  it("rejects a device without a firmware version", async () => {
    const device = createDevice({
      firmwareVersion: undefined,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        firmwareVersion: {
          kind: "required",
        },
      },
    });
  });

  it("rejects a firmware version longer than 50 characters", async () => {
    const device = createDevice({
      firmwareVersion: "A".repeat(51),
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        firmwareVersion: {
          kind: "maxlength",
        },
      },
    });
  });

  it("rejects a device without an owner", async () => {
    const device = createDevice({
      owner: undefined,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        owner: {
          kind: "required",
        },
      },
    });
  });

  it("rejects an owner longer than 100 characters", async () => {
    const device = createDevice({
      owner: "A".repeat(101),
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        owner: {
          kind: "maxlength",
        },
      },
    });
  });

  it("accepts ONLINE and OFFLINE device statuses", async () => {
    const onlineDevice = createDevice({
      status: "ONLINE",
    });

    const offlineDevice = createDevice({
      status: "OFFLINE",
    });

    await expect(onlineDevice.validate()).resolves.toBeUndefined();
    await expect(offlineDevice.validate()).resolves.toBeUndefined();
  });

  it("rejects an unsupported device status", async () => {
    const device = createDevice({
      status: "UNKNOWN",
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        status: {
          kind: "enum",
        },
      },
    });
  });

  it("accepts all supported health states", async () => {
    const healthStates = [
      "HEALTHY",
      "DEGRADED",
      "CRITICAL",
      "OFFLINE",
    ];

    for (const healthState of healthStates) {
      const device = createDevice({
        healthState,
      });

      await expect(device.validate()).resolves.toBeUndefined();
    }
  });

  it("rejects an unsupported health state", async () => {
    const device = createDevice({
      healthState: "UNKNOWN",
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        healthState: {
          kind: "enum",
        },
      },
    });
  });

  it("rejects a health score below 0", async () => {
    const device = createDevice({
      healthScore: -1,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        healthScore: {
          kind: "min",
        },
      },
    });
  });

  it("rejects a health score above 100", async () => {
    const device = createDevice({
      healthScore: 101,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        healthScore: {
          kind: "max",
        },
      },
    });
  });

  it("accepts health score boundary values", async () => {
    const minimumHealthDevice = createDevice({
      healthScore: 0,
    });

    const maximumHealthDevice = createDevice({
      healthScore: 100,
    });

    await expect(
      minimumHealthDevice.validate()
    ).resolves.toBeUndefined();

    await expect(
      maximumHealthDevice.validate()
    ).resolves.toBeUndefined();
  });

  it("rejects a device without lastSeenAt", async () => {
    const device = createDevice({
      lastSeenAt: undefined,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        lastSeenAt: {
          kind: "required",
        },
      },
    });
  });

  it("rejects a device without firstSeenAt", async () => {
    const device = createDevice({
      firstSeenAt: undefined,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        firstSeenAt: {
          kind: "required",
        },
      },
    });
  });

  it("rejects a negative telemetry count", async () => {
    const device = createDevice({
      telemetryCount: -1,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        telemetryCount: {
          kind: "min",
        },
      },
    });
  });

  it("rejects negative total flight hours", async () => {
    const device = createDevice({
      totalFlightHours: -0.1,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        totalFlightHours: {
          kind: "min",
        },
      },
    });
  });

  it("rejects negative completed missions", async () => {
    const device = createDevice({
      missionsCompleted: -1,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        missionsCompleted: {
          kind: "min",
        },
      },
    });
  });

  it("accepts an empty sensors array", async () => {
    const device = createDevice({
      sensors: [],
    });

    await expect(device.validate()).resolves.toBeUndefined();
  });

  it("rejects a device without latest telemetry", async () => {
    const device = createDevice({
      latestTelemetry: undefined,
    });

    await expect(device.validate()).rejects.toMatchObject({
      errors: {
        latestTelemetry: {
          kind: "required",
        },
      },
    });
  });

  it("trims supported string fields", () => {
    const device = createDevice({
      deviceId: "  FALCON-001  ",
      name: "  Falcon Test Aircraft  ",
      serialNumber: "  SN-FALCON-001  ",
      manufacturer: "  Falcon Aerospace  ",
      model: "  Falcon X1  ",
      firmwareVersion: "  1.0.0  ",
      owner: "  Project Falcon  ",
    });

    expect(device.deviceId).toBe("FALCON-001");
    expect(device.name).toBe("Falcon Test Aircraft");
    expect(device.serialNumber).toBe("SN-FALCON-001");
    expect(device.manufacturer).toBe("Falcon Aerospace");
    expect(device.model).toBe("Falcon X1");
    expect(device.firmwareVersion).toBe("1.0.0");
    expect(device.owner).toBe("Project Falcon");
  });
});