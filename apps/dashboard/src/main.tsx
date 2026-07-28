import React from "react";
import ReactDOM from "react-dom/client";
import L, {
  type LatLngBoundsExpression,
  type LatLngExpression
} from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap
} from "react-leaflet";
import { io } from "socket.io-client";

import "leaflet/dist/leaflet.css";
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

type DroneTrail = LatLngExpression[];

const gatewayUrl =
  import.meta.env.VITE_GATEWAY_URL ?? "http://localhost:5050";

const socket = io(gatewayUrl, {
  transports: ["websocket", "polling"]
});

const DEFAULT_MAP_CENTER: LatLngExpression = [48.4284, -123.3656];
const MAX_TRAIL_POINTS = 80;

function formatNumber(value: number, digits = 1): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function createDroneIcon(
  droneId: string,
  headingDeg: number,
  selected: boolean,
  hasAlert: boolean
) {
  const stateClass = hasAlert ? "has-alert" : "nominal";
  const selectedClass = selected ? "selected" : "";

  return L.divIcon({
    className: "falcon-marker-wrapper",
    html: `
      <div class="falcon-marker ${stateClass} ${selectedClass}">
        <div
          class="falcon-marker-arrow"
          style="transform: rotate(${headingDeg}deg)"
        >
          ▲
        </div>
        <span>${droneId}</span>
      </div>
    `,
    iconSize: [82, 52],
    iconAnchor: [41, 26],
    popupAnchor: [0, -28]
  });
}

function FleetMapController({
  drones
}: {
  drones: DroneEnvelope[];
}) {
  const map = useMap();
  const hasFittedFleet = React.useRef(false);

  React.useEffect(() => {
    if (drones.length === 0 || hasFittedFleet.current) {
      return;
    }

    const bounds: LatLngBoundsExpression = drones.map(({ telemetry }) => [
      telemetry.position.latitude,
      telemetry.position.longitude
    ]);

    map.fitBounds(bounds, {
      padding: [60, 60],
      maxZoom: 14
    });

    hasFittedFleet.current = true;
  }, [drones, map]);

  return null;
}

function App() {
  const [fleet, setFleet] = React.useState<Record<string, DroneEnvelope>>({});
  const [trails, setTrails] = React.useState<Record<string, DroneTrail>>({});
  const [connected, setConnected] = React.useState(socket.connected);
  const [lastEventAt, setLastEventAt] = React.useState<string>("—");
  const [selectedDroneId, setSelectedDroneId] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    function handleConnect() {
      setConnected(true);
    }

    function handleDisconnect() {
      setConnected(false);
    }

    function handleSnapshot(items: DroneEnvelope[]) {
      const nextFleet = Object.fromEntries(
        items.map((item) => [item.telemetry.droneId, item])
      );

      const nextTrails = Object.fromEntries(
        items.map((item) => [
          item.telemetry.droneId,
          [
            [
              item.telemetry.position.latitude,
              item.telemetry.position.longitude
            ] satisfies LatLngExpression
          ]
        ])
      );

      setFleet(nextFleet);
      setTrails(nextTrails);

      if (items.length > 0) {
        setSelectedDroneId((current) => {
          return current ?? items[0].telemetry.droneId;
        });
      }
    }

    function handleTelemetry(item: DroneEnvelope) {
      const { droneId, position } = item.telemetry;
      const nextPoint: LatLngExpression = [
        position.latitude,
        position.longitude
      ];

      setFleet((current) => ({
        ...current,
        [droneId]: item
      }));

      setTrails((current) => {
        const currentTrail = current[droneId] ?? [];
        const nextTrail = [...currentTrail, nextPoint].slice(
          -MAX_TRAIL_POINTS
        );

        return {
          ...current,
          [droneId]: nextTrail
        };
      });

      setSelectedDroneId((current) => current ?? droneId);
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
      : drones.reduce(
          (sum, drone) => sum + (drone.latencyMs ?? 0),
          0
        ) / drones.length;

  const selectedDrone =
    (selectedDroneId ? fleet[selectedDroneId] : undefined) ?? drones[0];

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">REAL-TIME IOT OPERATIONS</p>

          <h1>PROJECT FALCON</h1>

          <p className="subtitle">
            MQTT telemetry, gRPC alert evaluation, low-latency WebSocket
            delivery, and real-time fleet tracking.
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

      <section className="section-heading mission-heading">
        <div>
          <p className="eyebrow">MISSION CONTROL</p>
          <h2>Live Fleet Map</h2>
        </div>

        <div className="mission-legend">
          <span>
            <i className="legend-dot nominal-dot" />
            Nominal
          </span>

          <span>
            <i className="legend-dot alert-dot" />
            Alert
          </span>
        </div>
      </section>

      <section className="mission-layout">
        <article className="map-panel">
          <MapContainer
            center={DEFAULT_MAP_CENTER}
            zoom={13}
            scrollWheelZoom
            className="mission-map"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FleetMapController drones={drones} />

            {drones.map(({ telemetry, alerts, latencyMs }) => {
              const position: LatLngExpression = [
                telemetry.position.latitude,
                telemetry.position.longitude
              ];

              const trail = trails[telemetry.droneId] ?? [];
              const isSelected =
                selectedDroneId === telemetry.droneId;

              return (
                <React.Fragment key={telemetry.droneId}>
                  {trail.length > 1 && (
                    <Polyline
                      positions={trail}
                      pathOptions={{
                        weight: isSelected ? 4 : 2,
                        opacity: isSelected ? 0.9 : 0.45
                      }}
                    />
                  )}

                  <Marker
                    position={position}
                    icon={createDroneIcon(
                      telemetry.droneId,
                      telemetry.motion.headingDeg,
                      isSelected,
                      alerts.length > 0
                    )}
                    eventHandlers={{
                      click: () => {
                        setSelectedDroneId(telemetry.droneId);
                      }
                    }}
                  >
                    <Popup>
                      <div className="map-popup">
                        <strong>{telemetry.droneId}</strong>
                        <span>
                          Battery:{" "}
                          {formatNumber(
                            telemetry.power.batteryPercent
                          )}
                          %
                        </span>
                        <span>
                          Altitude:{" "}
                          {formatNumber(
                            telemetry.position.altitudeM
                          )}{" "}
                          m
                        </span>
                        <span>
                          Speed:{" "}
                          {formatNumber(
                            telemetry.motion.speedMps
                          )}{" "}
                          m/s
                        </span>
                        <span>
                          Latency:{" "}
                          {formatNumber(latencyMs ?? 0, 0)} ms
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>
        </article>

        <aside className="mission-sidebar">
          {selectedDrone ? (
            <>
              <div className="selected-drone-heading">
                <div>
                  <span className="drone-label">
                    SELECTED AIRCRAFT
                  </span>
                  <h3>{selectedDrone.telemetry.droneId}</h3>
                </div>

                <span
                  className={`mode mode-${selectedDrone.telemetry.flightMode.toLowerCase()}`}
                >
                  {selectedDrone.telemetry.flightMode.replaceAll(
                    "_",
                    " "
                  )}
                </span>
              </div>

              <div className="mission-stat-grid">
                <div>
                  <span>Battery</span>
                  <strong>
                    {formatNumber(
                      selectedDrone.telemetry.power.batteryPercent
                    )}
                    %
                  </strong>
                </div>

                <div>
                  <span>Voltage</span>
                  <strong>
                    {formatNumber(
                      selectedDrone.telemetry.power.voltageV
                    )}{" "}
                    V
                  </strong>
                </div>

                <div>
                  <span>Altitude</span>
                  <strong>
                    {formatNumber(
                      selectedDrone.telemetry.position.altitudeM
                    )}{" "}
                    m
                  </strong>
                </div>

                <div>
                  <span>Speed</span>
                  <strong>
                    {formatNumber(
                      selectedDrone.telemetry.motion.speedMps
                    )}{" "}
                    m/s
                  </strong>
                </div>

                <div>
                  <span>Heading</span>
                  <strong>
                    {formatNumber(
                      selectedDrone.telemetry.motion.headingDeg,
                      0
                    )}
                    °
                  </strong>
                </div>

                <div>
                  <span>Signal</span>
                  <strong>
                    {formatNumber(
                      selectedDrone.telemetry.health.signalDbm,
                      0
                    )}{" "}
                    dBm
                  </strong>
                </div>

                <div>
                  <span>Temperature</span>
                  <strong>
                    {formatNumber(
                      selectedDrone.telemetry.health.temperatureC
                    )}
                    °C
                  </strong>
                </div>

                <div>
                  <span>GPS Fix</span>
                  <strong>
                    {selectedDrone.telemetry.health.gpsFix
                      ? "LOCKED"
                      : "LOST"}
                  </strong>
                </div>
              </div>

              <div className="selected-coordinates">
                <span>Current Position</span>
                <strong>
                  {selectedDrone.telemetry.position.latitude.toFixed(
                    6
                  )}
                  ,{" "}
                  {selectedDrone.telemetry.position.longitude.toFixed(
                    6
                  )}
                </strong>
              </div>

              <div className="alerts">
                {selectedDrone.alerts.length === 0 ? (
                  <span className="nominal">
                    All systems nominal
                  </span>
                ) : (
                  selectedDrone.alerts.map((alert) => (
                    <span
                      className={`alert alert-${alert.severity.toLowerCase()}`}
                      key={`${selectedDrone.telemetry.droneId}-${alert.code}`}
                    >
                      {alert.message}
                    </span>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="mission-empty">
              Waiting for fleet telemetry.
            </div>
          )}
        </aside>
      </section>

      <section className="section-heading telemetry-heading">
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
            <article
              className={`drone-card ${
                selectedDroneId === telemetry.droneId
                  ? "drone-card-selected"
                  : ""
              }`}
              key={telemetry.droneId}
              onClick={() => {
                setSelectedDroneId(telemetry.droneId);
              }}
            >
              <div className="drone-card-header">
                <div>
                  <span className="drone-label">AIRCRAFT</span>
                  <h3>{telemetry.droneId}</h3>
                </div>

                <span
                  className={`mode mode-${telemetry.flightMode.toLowerCase()}`}
                >
                  {telemetry.flightMode.replaceAll("_", " ")}
                </span>
              </div>

              <div className="telemetry-grid">
                <div>
                  <span>Battery</span>
                  <strong>
                    {formatNumber(telemetry.power.batteryPercent)}%
                  </strong>
                </div>

                <div>
                  <span>Altitude</span>
                  <strong>
                    {formatNumber(telemetry.position.altitudeM)} m
                  </strong>
                </div>

                <div>
                  <span>Speed</span>
                  <strong>
                    {formatNumber(telemetry.motion.speedMps)} m/s
                  </strong>
                </div>

                <div>
                  <span>Signal</span>
                  <strong>
                    {formatNumber(
                      telemetry.health.signalDbm,
                      0
                    )}{" "}
                    dBm
                  </strong>
                </div>

                <div>
                  <span>Temperature</span>
                  <strong>
                    {formatNumber(
                      telemetry.health.temperatureC
                    )}
                    °C
                  </strong>
                </div>

                <div>
                  <span>Latency</span>
                  <strong>
                    {formatNumber(latencyMs ?? 0, 0)} ms
                  </strong>
                </div>
              </div>

              <div className="coordinates">
                {telemetry.position.latitude.toFixed(5)},{" "}
                {telemetry.position.longitude.toFixed(5)}
              </div>

              <div className="alerts">
                {alerts.length === 0 ? (
                  <span className="nominal">
                    All systems nominal
                  </span>
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