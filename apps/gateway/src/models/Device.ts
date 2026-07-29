import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
  Schema,
} from "mongoose";

const telemetrySchema = new Schema(
  {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },

    altitude: {
      type: Number,
      required: true,
    },

    speed: {
      type: Number,
      required: true,
      min: 0,
    },

    heading: {
      type: Number,
      required: true,
      min: 0,
      max: 360,
    },

    battery: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    voltage: {
      type: Number,
      required: true,
      min: 0,
    },

    signalStrength: {
      type: Number,
      required: true,
    },

    temperature: {
      type: Number,
      required: true,
    },

    flightMode: {
      type: String,
      required: true,
      trim: true,
    },

    timestamp: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const deviceSchema = new Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    serialNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    manufacturer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    model: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    firmwareVersion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    owner: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    status: {
      type: String,
      required: true,
      enum: ["ONLINE", "OFFLINE"],
      default: "OFFLINE",
      index: true,
    },

    healthState: {
      type: String,
      required: true,
      enum: ["HEALTHY", "DEGRADED", "CRITICAL", "OFFLINE"],
      default: "OFFLINE",
      index: true,
    },

    healthScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },

    lastSeenAt: {
      type: String,
      required: true,
    },

    firstSeenAt: {
      type: String,
      required: true,
    },

    telemetryCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    totalFlightHours: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    missionsCompleted: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    sensors: {
      type: [String],
      required: true,
      default: [],
    },

    latestTelemetry: {
      type: telemetrySchema,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

deviceSchema.index({
  status: 1,
  healthState: 1,
});

deviceSchema.index({
  lastSeenAt: -1,
});

export type DeviceRecord = InferSchemaType<typeof deviceSchema>;
export type DeviceDocument = HydratedDocument<DeviceRecord>;

export const DeviceModel =
  mongoose.models.Device ??
  mongoose.model<DeviceRecord>("Device", deviceSchema);