import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import "./App.css";

const GATEWAY_URL =
  import.meta.env.VITE_GATEWAY_URL ?? "http://localhost:5050";

const TELEMETRY_INTERVAL_MS = 500;

type ConnectionStatus =
  | "Disconnected"
  | "Connecting"
  | "Connected"
  | "Error";

type FlightMode = "STANDBY" | "HOVER" | "MISSION" | "LANDING";

type ActivityEntry = {
  id: number;
  message: string;
  timestamp: string;
};

type TelemetryPayload = {
  schemaVersion: number;
  droneId: string;
  timestamp: string;
  sequence: number;
  position: {
    latitude: number;
    longitude: number;
    altitudeM: number;
  };
  motion: {
    speedMps: number;
    headingDeg: number;
  };
  power: {
    batteryPercent: number;
    voltageV: number;
  };
  health: {
    temperatureC: number;
    signalDbm: number;
    gpsFix: boolean;
  };
  flightMode: FlightMode;
};

function createActivityEntry(
  id: number,
  message: string
): ActivityEntry {
  return {
    id,
    message,
    timestamp: new Date().toLocaleTimeString(),
  };
}

function App() {
  const [droneId, setDroneId] = useState("falcon-05");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("Disconnected");
  const [isPoweredOn, setIsPoweredOn] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);

  const [altitudeM, setAltitudeM] = useState(120);
  const [targetAltitudeM, setTargetAltitudeM] = useState(120);
  const [headingDeg, setHeadingDeg] = useState(180);
  const [speedMps, setSpeedMps] = useState(0);
  const [batteryPercent, setBatteryPercent] = useState(100);
  const [temperatureC, setTemperatureC] = useState(34);
  const [signalDbm] = useState(-54);
  const [flightMode, setFlightMode] =
    useState<FlightMode>("STANDBY");

  const [lastTransmissionAt, setLastTransmissionAt] =
    useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([
    createActivityEntry(1, "Drone console initialized."),
  ]);

  const socketRef = useRef<Socket | null>(null);
  const telemetryTimerRef = useRef<number | null>(null);
  const sequenceRef = useRef(0);
  const activityIdRef = useRef(1);

  const addActivity = useCallback((message: string) => {
    activityIdRef.current += 1;

    setActivity((currentActivity) =>
      [
        createActivityEntry(activityIdRef.current, message),
        ...currentActivity,
      ].slice(0, 12)
    );
  }, []);

  const telemetrySnapshot = useMemo(
  () => ({
    schemaVersion: 1,
    droneId: droneId.trim(),
    position: {
      latitude: 48.4284,
      longitude: -123.3656,
      altitudeM,
    },
    motion: {
      speedMps,
      headingDeg,
    },
    power: {
      batteryPercent,
      voltageV: Number(
        (22 + batteryPercent * 0.018).toFixed(2)
      ),
    },
    health: {
      temperatureC,
      signalDbm,
      gpsFix: true,
    },
    flightMode,
  }),
  [
    altitudeM,
    batteryPercent,
    droneId,
    flightMode,
    headingDeg,
    signalDbm,
    speedMps,
    temperatureC,
  ]
);

  const stopTelemetry = useCallback(() => {
    if (telemetryTimerRef.current !== null) {
      window.clearInterval(telemetryTimerRef.current);
      telemetryTimerRef.current = null;
    }

    setIsTransmitting(false);
  }, []);

  const transmitTelemetry = useCallback(() => {
    const socket = socketRef.current;

    if (!socket?.connected || !isPoweredOn) {
      return;
    }

    sequenceRef.current += 1;

const payload: TelemetryPayload = {
  ...telemetrySnapshot,
  timestamp: new Date().toISOString(),
  sequence: sequenceRef.current,
};

    socket.emit("drone:telemetry", payload);

    setLastTransmissionAt(
      new Date().toLocaleTimeString()
    );

    setBatteryPercent((currentBattery) =>
      Math.max(0, Number((currentBattery - 0.02).toFixed(2)))
    );

    setTemperatureC((currentTemperature) =>
      Math.min(
        72,
        Number((currentTemperature + 0.01).toFixed(2))
      )
    );

    setAltitudeM((currentAltitude) => {
      if (currentAltitude === targetAltitudeM) {
        return currentAltitude;
      }

      const difference = targetAltitudeM - currentAltitude;
      const adjustment = Math.sign(difference) * Math.min(
        Math.abs(difference),
        2
      );

      return currentAltitude + adjustment;
    });
  }, [isPoweredOn,targetAltitudeM,telemetrySnapshot]);

  const startTelemetry = useCallback(() => {
    if (
      telemetryTimerRef.current !== null ||
      !socketRef.current?.connected
    ) {
      return;
    }

    setIsTransmitting(true);
    addActivity("Telemetry transmission started.");

    transmitTelemetry();

    telemetryTimerRef.current = window.setInterval(
      transmitTelemetry,
      TELEMETRY_INTERVAL_MS
    );
  }, [addActivity, transmitTelemetry]);

  const connectDrone = useCallback(() => {
    const normalizedDroneId = droneId.trim();

    if (!normalizedDroneId) {
      addActivity("Connection rejected: Drone ID is required.");
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    setConnectionStatus("Connecting");
    addActivity(`Connecting ${normalizedDroneId} to Falcon Gateway.`);

    const socket = io(GATEWAY_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("Connected");

      socket.emit("drone:connect", {
        droneId: normalizedDroneId,
        telemetryIntervalMs: TELEMETRY_INTERVAL_MS,
      });

      addActivity(
        `${normalizedDroneId} connected to Falcon Gateway.`
      );
    });

    socket.on("disconnect", (reason) => {
      stopTelemetry();
      setConnectionStatus("Disconnected");
      setIsPoweredOn(false);

      addActivity(`Gateway connection closed: ${reason}.`);
    });

    socket.on("connect_error", (error) => {
      stopTelemetry();
      setConnectionStatus("Error");
      setIsPoweredOn(false);

      addActivity(`Gateway connection failed: ${error.message}`);
    });

    socket.on("drone:acknowledged", (payload: unknown) => {
      console.info("Drone acknowledged by gateway:", payload);
      addActivity("Falcon Gateway acknowledged the drone.");
    });

    socket.connect();
  }, [addActivity, droneId, stopTelemetry]);

  const disconnectDrone = useCallback(() => {
    stopTelemetry();

    const socket = socketRef.current;

    if (socket) {
      socket.emit("drone:disconnect", {
        droneId: droneId.trim(),
      });

      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    }

    setConnectionStatus("Disconnected");
    setIsPoweredOn(false);
    setFlightMode("STANDBY");

    addActivity(`${droneId.trim()} disconnected.`);
  }, [addActivity, droneId, stopTelemetry]);

  const powerOn = useCallback(() => {
    if (connectionStatus !== "Connected") {
      addActivity("Connect to Falcon Gateway before powering on.");
      return;
    }

    setIsPoweredOn(true);
    setFlightMode("HOVER");

    addActivity(`${droneId.trim()} powered on.`);
  }, [addActivity, connectionStatus, droneId]);

  const powerOff = useCallback(() => {
    stopTelemetry();

    socketRef.current?.emit("drone:power-off", {
      droneId: droneId.trim(),
    });

    setIsPoweredOn(false);
    setFlightMode("STANDBY");
    setSpeedMps(0);

    addActivity(`${droneId.trim()} powered off.`);
  }, [addActivity, droneId, stopTelemetry]);

  const beginFlight = useCallback(() => {
    if (!isPoweredOn) {
      addActivity("Power on the drone before beginning flight.");
      return;
    }

    setFlightMode("MISSION");
    setSpeedMps(14.5);

    addActivity("Mission flight started.");
  }, [addActivity, isPoweredOn]);

  const landDrone = useCallback(() => {
    if (!isPoweredOn) {
      return;
    }

    setFlightMode("LANDING");
    setTargetAltitudeM(0);
    setSpeedMps(3);

    addActivity("Landing sequence initiated.");
  }, [addActivity, isPoweredOn]);

  useEffect(() => {
    return () => {
      if (telemetryTimerRef.current !== null) {
        window.clearInterval(telemetryTimerRef.current);
      }

      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
    };
  }, []);

  const connectionClassName =
    connectionStatus === "Connected"
      ? "status-positive"
      : connectionStatus === "Connecting"
        ? "status-warning"
        : "status-negative";

  return (
    <main className="drone-console">
      <header className="console-header">
        <div>
          <p className="eyebrow">Falcon Native Device Interface</p>
          <h1>DRONE CONSOLE</h1>
          <p className="subtitle">
            Single-aircraft control and live telemetry transmission
          </p>
        </div>

        <div className={`connection-badge ${connectionClassName}`}>
          <span className="status-dot" />
          {connectionStatus}
        </div>
      </header>

      <section className="console-grid">
        <article className="panel identity-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">Aircraft Identity</p>
              <h2>{droneId || "Unassigned Drone"}</h2>
            </div>

            <span className={`power-indicator ${isPoweredOn ? "active" : ""}`}>
              {isPoweredOn ? "Powered On" : "Powered Off"}
            </span>
          </div>

          <label className="field-label" htmlFor="drone-id">
            Drone ID
          </label>

          <input
            id="drone-id"
            className="text-input"
            type="text"
            value={droneId}
            disabled={connectionStatus !== "Disconnected"}
            onChange={(event) => setDroneId(event.target.value)}
            placeholder="falcon-05"
          />

          <div className="identity-details">
            <div>
              <span>Gateway</span>
              <strong>{GATEWAY_URL}</strong>
            </div>

            <div>
              <span>Flight Mode</span>
              <strong>{flightMode}</strong>
            </div>

            <div>
              <span>Telemetry</span>
              <strong>
                {isTransmitting ? "Transmitting" : "Stopped"}
              </strong>
            </div>

            <div>
              <span>Last Transmission</span>
              <strong>{lastTransmissionAt ?? "Never"}</strong>
            </div>
          </div>

          <div className="button-row">
            <button
              type="button"
              className="button button-primary"
              disabled={
                connectionStatus === "Connected" ||
                connectionStatus === "Connecting"
              }
              onClick={connectDrone}
            >
              Connect
            </button>

            <button
              type="button"
              className="button button-secondary"
              disabled={connectionStatus === "Disconnected"}
              onClick={disconnectDrone}
            >
              Disconnect
            </button>
          </div>
        </article>

        <article className="panel telemetry-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">Live Aircraft Data</p>
              <h2>Telemetry</h2>
            </div>

            <span className={`transmission-state ${isTransmitting ? "active" : ""}`}>
              {isTransmitting ? "Live" : "Idle"}
            </span>
          </div>

          <div className="metric-grid">
            <div className="metric-card">
              <span>Altitude</span>
              <strong>{altitudeM.toFixed(0)}</strong>
              <small>metres</small>
            </div>

            <div className="metric-card">
              <span>Battery</span>
              <strong>{batteryPercent.toFixed(1)}</strong>
              <small>percent</small>
            </div>

            <div className="metric-card">
              <span>Heading</span>
              <strong>{headingDeg.toFixed(0)}°</strong>
              <small>bearing</small>
            </div>

            <div className="metric-card">
              <span>Speed</span>
              <strong>{speedMps.toFixed(1)}</strong>
              <small>m/s</small>
            </div>

            <div className="metric-card">
              <span>Temperature</span>
              <strong>{temperatureC.toFixed(1)}°</strong>
              <small>Celsius</small>
            </div>

            <div className="metric-card">
              <span>Signal</span>
              <strong>{signalDbm}</strong>
              <small>dBm</small>
            </div>
          </div>
        </article>

        <article className="panel controls-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">Flight Controls</p>
              <h2>Altitude Control</h2>
            </div>

            <span className="target-altitude">
              Target {targetAltitudeM} m
            </span>
          </div>

          <div className="altitude-control">
            <button
              type="button"
              className="adjust-button"
              disabled={!isPoweredOn}
              onClick={() =>
                setTargetAltitudeM((current) =>
                  Math.max(0, current - 10)
                )
              }
            >
              -10
            </button>

            <input
              className="altitude-slider"
              type="range"
              min="0"
              max="500"
              step="5"
              value={targetAltitudeM}
              disabled={!isPoweredOn}
              aria-label="Target altitude"
              onChange={(event) =>
                setTargetAltitudeM(Number(event.target.value))
              }
            />

            <button
              type="button"
              className="adjust-button"
              disabled={!isPoweredOn}
              onClick={() =>
                setTargetAltitudeM((current) =>
                  Math.min(500, current + 10)
                )
              }
            >
              +10
            </button>
          </div>

          <label className="field-label" htmlFor="heading">
            Heading: {headingDeg}°
          </label>

          <input
            id="heading"
            className="altitude-slider"
            type="range"
            min="0"
            max="359"
            step="1"
            value={headingDeg}
            disabled={!isPoweredOn}
            onChange={(event) =>
              setHeadingDeg(Number(event.target.value))
            }
          />

          <div className="button-row control-buttons">
            <button
              type="button"
              className="button button-primary"
              disabled={
                connectionStatus !== "Connected" || isPoweredOn
              }
              onClick={powerOn}
            >
              Power On
            </button>

            <button
              type="button"
              className="button button-primary"
              disabled={!isPoweredOn || isTransmitting}
              onClick={startTelemetry}
            >
              Start Telemetry
            </button>

            <button
              type="button"
              className="button button-secondary"
              disabled={!isPoweredOn}
              onClick={beginFlight}
            >
              Begin Flight
            </button>

            <button
              type="button"
              className="button button-secondary"
              disabled={!isPoweredOn}
              onClick={landDrone}
            >
              Land
            </button>

            <button
              type="button"
              className="button button-danger"
              disabled={!isPoweredOn}
              onClick={powerOff}
            >
              Power Off
            </button>
          </div>
        </article>

        <article className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">Aircraft Events</p>
              <h2>Activity Log</h2>
            </div>

            <span>{activity.length} events</span>
          </div>

          <div className="activity-list">
            {activity.map((entry) => (
              <div className="activity-entry" key={entry.id}>
                <span>{entry.timestamp}</span>
                <p>{entry.message}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

export default App;