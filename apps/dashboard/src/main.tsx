import React from "react";
import ReactDOM from "react-dom/client";
import { io } from "socket.io-client";
import "./styles.css";

type Alert = {
  code: string;
  severity: "WARNING" | "CRITICAL" | string;
  message: string;
};

type Telemetry = {
  droneId: string;
  timestamp: string;
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
  flightMode: string;
};

type DroneEnvelope = {
  telemetry: Telemetry;
  alerts: Alert[];
  gatewayReceivedAt: string;
  latencyMs?: number;
};

const gatewayUrl = import.meta.env.VITE_GATEWAY_URL ?? "http://localhost:5050";
const socket = io(gatewayUrl, {
  transports: ["websocket", "polling"]
});

function formatNumber(value: number, digits = 1): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function App() {
  const [fleet, setFleet] = React.useState<Record<string, DroneEnvelope>>({});
  const [connected, setConnected] = React.useState(socket.connected);
  const [lastEventAt, setLastEventAt] = React.useState<string>("—");

  React.useEffect(() => {
    function handleConnect() {
      setConnected(true);
    }

    function handleDisconnect() {
      setConnected(false);
    }

    function handleSnapshot(items: DroneEnvelope[]) {
      const next = Object.fromEntries(
        items.map((item) => [item.telemetry.droneId, item])
      );
      setFleet(next);
    }

    function handleTelemetry(item: DroneEnvelope) {
      setFleet((current) => ({
        ...current,
        [item.telemetry.droneId]: item
      }));
      setLastEventAt(new Date().toLocaleTimeString());
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("fleet:snapshot", handleSnapshot);
    socket.on("telemetry:update", handleTelemetry);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("fleet:snapshot", handleSnapshot);
      socket.off("telemetry:update", handleTelemetry);
    };
  }, []);

  const drones = Object.values(fleet).sort((a, b) =>
    a.telemetry.droneId.localeCompare(b.telemetry.droneId)
  );

  const activeAlerts = drones.flatMap((drone) => drone.alerts);
  const averageLatency =
    drones.length === 0
      ? 0
      : drones.reduce((sum, drone) => sum + (drone.latencyMs ?? 0), 0) /
        drones.length;

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">REAL-TIME IOT OPERATIONS</p>
          <h1>PROJECT FALCON</h1>
          <p className="subtitle">
            MQTT telemetry, gRPC alert evaluation, and low-latency WebSocket delivery.
          </p>
        </div>

        <div className={`connection ${connected ? "online" : "offline"}`}>
          <span />
          {connected ? "LIVE" : "DISCONNECTED"}
        </div>
      </header>

      <section className="summary-grid">
        <article className="summary-card">
          <span>Connected Drones</span>
          <strong>{drones.length}</strong>
        </article>
        <article className="summary-card">
          <span>Active Alerts</span>
          <strong>{activeAlerts.length}</strong>
        </article>
        <article className="summary-card">
          <span>Average Latency</span>
          <strong>{formatNumber(averageLatency, 0)} ms</strong>
        </article>
        <article className="summary-card">
          <span>Last Event</span>
          <strong>{lastEventAt}</strong>
        </article>
      </section>

      <section className="section-heading">
        <div>
          <p className="eyebrow">FLEET STATUS</p>
          <h2>Live Telemetry</h2>
        </div>
      </section>

      <section className="fleet-grid">
        {drones.length === 0 ? (
          <article className="empty-state">
            Waiting for MQTT telemetry from the simulator.
          </article>
        ) : (
          drones.map(({ telemetry, alerts, latencyMs }) => (
            <article className="drone-card" key={telemetry.droneId}>
              <div className="drone-card-header">
                <div>
                  <span className="drone-label">AIRCRAFT</span>
                  <h3>{telemetry.droneId}</h3>
                </div>
                <span className={`mode mode-${telemetry.flightMode.toLowerCase()}`}>
                  {telemetry.flightMode.replaceAll("_", " ")}
                </span>
              </div>

              <div className="telemetry-grid">
                <div>
                  <span>Battery</span>
                  <strong>{formatNumber(telemetry.power.batteryPercent)}%</strong>
                </div>
                <div>
                  <span>Altitude</span>
                  <strong>{formatNumber(telemetry.position.altitudeM)} m</strong>
                </div>
                <div>
                  <span>Speed</span>
                  <strong>{formatNumber(telemetry.motion.speedMps)} m/s</strong>
                </div>
                <div>
                  <span>Signal</span>
                  <strong>{formatNumber(telemetry.health.signalDbm, 0)} dBm</strong>
                </div>
                <div>
                  <span>Temperature</span>
                  <strong>{formatNumber(telemetry.health.temperatureC)} °C</strong>
                </div>
                <div>
                  <span>Latency</span>
                  <strong>{formatNumber(latencyMs ?? 0, 0)} ms</strong>
                </div>
              </div>

              <div className="coordinates">
                {telemetry.position.latitude.toFixed(5)},{" "}
                {telemetry.position.longitude.toFixed(5)}
              </div>

              <div className="alerts">
                {alerts.length === 0 ? (
                  <span className="nominal">All systems nominal</span>
                ) : (
                  alerts.map((alert) => (
                    <span
                      className={`alert alert-${alert.severity.toLowerCase()}`}
                      key={`${telemetry.droneId}-${alert.code}`}
                    >
                      {alert.message}
                    </span>
                  ))
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
