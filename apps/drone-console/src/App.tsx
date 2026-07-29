import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import "./App.css";

const GATEWAY_URL =
  import.meta.env.VITE_GATEWAY_URL ?? "http://localhost:5050";

const TELEMETRY_STALE_AFTER_MS = 3_000;

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
  schemaVersion?: number;
  droneId: string;
  timestamp: string;
  sequence?: number;
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

type DroneEnvelope = {
  telemetry: TelemetryPayload;
  alerts?: Array<{
    code: string;
    severity: string;
    message: string;
  }>;
  gatewayReceivedAt?: string;
  latencyMs?: number;
};

type DroneCommand =
  | "START_MISSION"
  | "PAUSE_MISSION"
  | "RESUME_MISSION"
  | "HOVER"
  | "RETURN_TO_HOME"
  | "LAND"
  | "SET_ALTITUDE"
  | "SET_HEADING";

type CommandStatusPayload = {
  droneId: string;
  command?: string;
  status?: string;
  message?: string;
};

function createActivityEntry(id: number, message: string): ActivityEntry {
  return {
    id,
    message,
    timestamp: new Date().toLocaleTimeString(),
  };
}

function formatTelemetryTime(timestamp: string): string {
  const parsedTimestamp = new Date(timestamp);

  return Number.isNaN(parsedTimestamp.getTime())
    ? timestamp
    : parsedTimestamp.toLocaleTimeString();
}

function App() {
  const [droneId, setDroneId] = useState("falcon-05");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("Disconnected");
  const [isAircraftOnline, setIsAircraftOnline] = useState(false);
  const [isReceivingTelemetry, setIsReceivingTelemetry] = useState(false);

  const [altitudeM, setAltitudeM] = useState(0);
  const [targetAltitudeM, setTargetAltitudeM] = useState(120);
  const [headingDeg, setHeadingDeg] = useState(0);
  const [targetHeadingDeg, setTargetHeadingDeg] = useState(180);
  const [speedMps, setSpeedMps] = useState(0);
  const [batteryPercent, setBatteryPercent] = useState(0);
  const [voltageV, setVoltageV] = useState(0);
  const [temperatureC, setTemperatureC] = useState(0);
  const [signalDbm, setSignalDbm] = useState(0);
  const [gpsFix, setGpsFix] = useState(false);
  const [flightMode, setFlightMode] = useState<FlightMode>("STANDBY");

  const [lastTransmissionAt, setLastTransmissionAt] =
    useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([
    createActivityEntry(1, "Drone console initialized."),
  ]);

  const socketRef = useRef<Socket | null>(null);
  const telemetryStaleTimerRef = useRef<number | null>(null);
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

  const clearTelemetryStaleTimer = useCallback(() => {
    if (telemetryStaleTimerRef.current !== null) {
      window.clearTimeout(telemetryStaleTimerRef.current);
      telemetryStaleTimerRef.current = null;
    }
  }, []);

  const markTelemetryReceived = useCallback(() => {
    clearTelemetryStaleTimer();
    setIsReceivingTelemetry(true);
    setIsAircraftOnline(true);

    telemetryStaleTimerRef.current = window.setTimeout(() => {
      setIsReceivingTelemetry(false);
      setIsAircraftOnline(false);
      addActivity(`${droneId.trim()} telemetry timed out.`);
    }, TELEMETRY_STALE_AFTER_MS);
  }, [addActivity, clearTelemetryStaleTimer, droneId]);

  const applyTelemetry = useCallback(
    (telemetry: TelemetryPayload) => {
      const normalizedDroneId = droneId.trim();

      if (telemetry.droneId !== normalizedDroneId) {
        return;
      }

      setAltitudeM(telemetry.position.altitudeM);
      setHeadingDeg(telemetry.motion.headingDeg);
      setSpeedMps(telemetry.motion.speedMps);
      setBatteryPercent(telemetry.power.batteryPercent);
      setVoltageV(telemetry.power.voltageV);
      setTemperatureC(telemetry.health.temperatureC);
      setSignalDbm(telemetry.health.signalDbm);
      setGpsFix(telemetry.health.gpsFix);
      setFlightMode(telemetry.flightMode);
      setLastTransmissionAt(formatTelemetryTime(telemetry.timestamp));
      markTelemetryReceived();
    },
    [droneId, markTelemetryReceived]
  );

  const handleTelemetryEnvelope = useCallback(
    (envelope: DroneEnvelope) => {
      if (!envelope?.telemetry) {
        return;
      }

      applyTelemetry(envelope.telemetry);
    },
    [applyTelemetry]
  );

  const handleFleetSnapshot = useCallback(
    (items: DroneEnvelope[]) => {
      const normalizedDroneId = droneId.trim();
      const selectedDrone = items.find(
        (item) => item.telemetry.droneId === normalizedDroneId
      );

      if (selectedDrone) {
        applyTelemetry(selectedDrone.telemetry);
        addActivity(`${normalizedDroneId} found in Falcon fleet.`);
      } else {
        setIsAircraftOnline(false);
        setIsReceivingTelemetry(false);
        addActivity(`${normalizedDroneId} is not currently in the fleet.`);
      }
    },
    [addActivity, applyTelemetry, droneId]
  );

  const handleCommandStatus = useCallback(
    (payload: CommandStatusPayload) => {
      if (payload.droneId !== droneId.trim()) {
        return;
      }

      const command = payload.command ?? "Drone command";
      const status = payload.status ?? "updated";
      const message = payload.message ? `: ${payload.message}` : "";

      addActivity(`${command} ${status}${message}`);
    },
    [addActivity, droneId]
  );

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
    addActivity(`Connecting console to Falcon Gateway for ${normalizedDroneId}.`);

    const socket = io(GATEWAY_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("Connected");
      addActivity("Drone Console connected to Falcon Gateway.");
    });

    socket.on("disconnect", (reason) => {
      clearTelemetryStaleTimer();
      setConnectionStatus("Disconnected");
      setIsAircraftOnline(false);
      setIsReceivingTelemetry(false);
      addActivity(`Gateway connection closed: ${reason}.`);
    });

    socket.on("connect_error", (error) => {
      clearTelemetryStaleTimer();
      setConnectionStatus("Error");
      setIsAircraftOnline(false);
      setIsReceivingTelemetry(false);
      addActivity(`Gateway connection failed: ${error.message}`);
    });

    socket.on("fleet:snapshot", handleFleetSnapshot);
    socket.on("telemetry:update", handleTelemetryEnvelope);
    socket.on("drone:command-status", handleCommandStatus);
    socket.on("command:status", handleCommandStatus);
    socket.on("command:dispatched", (payload: CommandStatusPayload) => {
      if (payload.droneId === normalizedDroneId) {
        addActivity(`${payload.command ?? "Command"} dispatched to MQTT.`);
      }
    });
    socket.on("command:error", (payload: { message?: string }) => {
      addActivity(`Command error: ${payload.message ?? "Unknown error."}`);
    });

    socket.connect();
  }, [
    addActivity,
    clearTelemetryStaleTimer,
    droneId,
    handleCommandStatus,
    handleFleetSnapshot,
    handleTelemetryEnvelope,
  ]);

  const disconnectDrone = useCallback(() => {
    clearTelemetryStaleTimer();

    const socket = socketRef.current;

    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    }

    setConnectionStatus("Disconnected");
    setIsAircraftOnline(false);
    setIsReceivingTelemetry(false);
    setFlightMode("STANDBY");

    addActivity("Drone Console disconnected from Falcon Gateway.");
  }, [addActivity, clearTelemetryStaleTimer]);

  const sendCommand = useCallback(
    (
      command: DroneCommand,
      parameters?: Record<string, number>
    ) => {
      const socket = socketRef.current;
      const normalizedDroneId = droneId.trim();

      if (!socket?.connected) {
        addActivity(
          "Connect to Falcon Gateway before sending commands."
        );
        return;
      }

      const payload = {
        droneId: normalizedDroneId,
        command,
        parameters,
        timestamp: new Date().toISOString(),
      };

      console.info("Emitting drone:command", payload);

      socket.timeout(5_000).emit(
        "drone:command",
        payload,
        (
          error: Error | null,
          result?: {
            success?: boolean;
            command?: string;
            commandId?: string;
            message?: string;
          }
        ) => {
          if (error) {
            addActivity(
              `${command} gateway acknowledgment timed out.`
            );

            console.error(
              "drone:command acknowledgment timed out",
              error
            );

            return;
          }

          if (!result?.success) {
            addActivity(
              `${command} rejected: ${result?.message ?? "Unknown gateway error."
              }`
            );

            return;
          }

          addActivity(
            `${result.command ?? command} dispatched by gateway.`
          );
        }
      );

      addActivity(
        `${command} command sent to ${normalizedDroneId}.`
      );
    },
    [addActivity, droneId]
  );
  const startMission = useCallback(() => {
    sendCommand("START_MISSION");
  }, [sendCommand]);

  const pauseMission = useCallback(() => {
    sendCommand("PAUSE_MISSION");
  }, [sendCommand]);

  const resumeMission = useCallback(() => {
    sendCommand("RESUME_MISSION");
  }, [sendCommand]);

  const hoverDrone = useCallback(() => {
    sendCommand("HOVER");
  }, [sendCommand]);

  const returnToHome = useCallback(() => {
    sendCommand("RETURN_TO_HOME");
  }, [sendCommand]);

  const landDrone = useCallback(() => {
    sendCommand("LAND");
  }, [sendCommand]);

  useEffect(() => {
    return () => {
      clearTelemetryStaleTimer();
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
    };
  }, [clearTelemetryStaleTimer]);

  const connectionClassName =
    connectionStatus === "Connected"
      ? "status-positive"
      : connectionStatus === "Connecting"
        ? "status-warning"
        : "status-negative";

  const controlsDisabled = connectionStatus !== "Connected";

  return (
    <main className="drone-console">
      <header className="console-header">
        <div>
          <p className="eyebrow">Falcon Ground Control Interface</p>
          <h1>DRONE CONSOLE</h1>
          <p className="subtitle">
            Single-aircraft command and live gateway telemetry
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

            <span className={`power-indicator ${isAircraftOnline ? "active" : ""}`}>
              {isAircraftOnline ? "Aircraft Online" : "Aircraft Offline"}
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
              <strong>{isReceivingTelemetry ? "Receiving" : "Waiting"}</strong>
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

            <span className={`transmission-state ${isReceivingTelemetry ? "active" : ""}`}>
              {isReceivingTelemetry ? "Live" : "Idle"}
            </span>
          </div>

          <div className="metric-grid">
            <div className="metric-card">
              <span>Altitude</span>
              <strong>{altitudeM.toFixed(1)}</strong>
              <small>metres</small>
            </div>

            <div className="metric-card">
              <span>Battery</span>
              <strong>{batteryPercent.toFixed(1)}</strong>
              <small>percent</small>
            </div>

            <div className="metric-card">
              <span>Heading</span>
              <strong>{headingDeg.toFixed(1)}°</strong>
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

            <div className="metric-card">
              <span>Voltage</span>
              <strong>{voltageV.toFixed(2)}</strong>
              <small>volts</small>
            </div>

            <div className="metric-card">
              <span>GPS</span>
              <strong>{gpsFix ? "LOCKED" : "LOST"}</strong>
              <small>fix status</small>
            </div>
          </div>
        </article>

        <article className="panel controls-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-label">Flight Controls</p>
              <h2>Command Aircraft</h2>
            </div>

            <span className="target-altitude">
              Target {targetAltitudeM} m
            </span>
          </div>

          <div className="altitude-control">
            <button
              type="button"
              className="adjust-button"
              disabled={controlsDisabled}
              onClick={() =>
                setTargetAltitudeM((current) => Math.max(0, current - 10))
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
              disabled={controlsDisabled}
              aria-label="Target altitude"
              onChange={(event) =>
                setTargetAltitudeM(Number(event.target.value))
              }
            />

            <button
              type="button"
              className="adjust-button"
              disabled={controlsDisabled}
              onClick={() =>
                setTargetAltitudeM((current) => Math.min(500, current + 10))
              }
            >
              +10
            </button>
          </div>

          <button
  type="button"
  className="button button-primary"
  disabled={controlsDisabled}
  onClick={() =>
    sendCommand("SET_ALTITUDE", {
      altitudeM: targetAltitudeM,
    })
  }
>
  Apply Altitude
</button>

          <label className="field-label" htmlFor="heading">
            Target heading: {targetHeadingDeg}°
          </label>

          <input
            id="heading"
            className="altitude-slider"
            type="range"
            min="0"
            max="359"
            step="1"
            value={targetHeadingDeg}
            disabled={controlsDisabled}
            onChange={(event) =>
              setTargetHeadingDeg(Number(event.target.value))
            }
          />

          <button
  type="button"
  className="button button-primary"
  disabled={controlsDisabled}
  onClick={() =>
    sendCommand("SET_HEADING", {
      headingDeg: targetHeadingDeg,
    })
  }
>
  Apply Heading
</button>

          <div className="button-row control-buttons">
            <button
              type="button"
              className="button button-primary"
              disabled={controlsDisabled}
              onClick={startMission}
            >
              Start Mission
            </button>

            <button
              type="button"
              className="button button-secondary"
              disabled={controlsDisabled}
              onClick={pauseMission}
            >
              Pause Mission
            </button>

            <button
              type="button"
              className="button button-secondary"
              disabled={controlsDisabled}
              onClick={resumeMission}
            >
              Resume Mission
            </button>

            <button
              type="button"
              className="button button-secondary"
              disabled={controlsDisabled}
              onClick={hoverDrone}
            >
              Hover
            </button>

            <button
              type="button"
              className="button button-secondary"
              disabled={controlsDisabled}
              onClick={returnToHome}
            >
              Return Home
            </button>

            <button
              type="button"
              className="button button-danger"
              disabled={controlsDisabled}
              onClick={landDrone}
            >
              Land
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
