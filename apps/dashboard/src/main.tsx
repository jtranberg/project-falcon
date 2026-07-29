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

type RegisteredDevice = {
  id: string;
  name: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  owner: string;
  status: "ONLINE" | "OFFLINE";
  healthState:
  | "HEALTHY"
  | "DEGRADED"
  | "CRITICAL"
  | "OFFLINE"
  | string;
  healthScore: number;
  firstSeenAt: string;
  lastSeenAt: string;
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
};

type DeviceProfileDraft = {
  name: string;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  owner: string;
  totalFlightHours: number;
  missionsCompleted: number;
};

type RegistrySnapshotPayload = {
  devices: RegisteredDevice[];
};

type DeviceUpdatedPayload = {
  device: RegisteredDevice;
};

type DeviceDeletedPayload = {
  deviceId: string;
};

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

function formatLastSeen(timestamp: string): string {
  const parsedTimestamp = new Date(timestamp);

  if (Number.isNaN(parsedTimestamp.getTime())) {
    return "Unknown";
  }

  const elapsedMilliseconds = Date.now() - parsedTimestamp.getTime();

  if (elapsedMilliseconds < 10_000) {
    return "Live";
  }

  if (elapsedMilliseconds < 60_000) {
    return `${Math.floor(elapsedMilliseconds / 1_000)} sec ago`;
  }

  return parsedTimestamp.toLocaleTimeString();
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
  const [devices, setDevices] = React.useState<RegisteredDevice[]>([]);
  const [connected, setConnected] = React.useState(socket.connected);
  const [lastEventAt, setLastEventAt] = React.useState<string>("—");
  const [selectedDroneId, setSelectedDroneId] = React.useState<string | null>(
    null
  );

  const [editingDevice, setEditingDevice] = React.useState(false);

  const [deviceDraft, setDeviceDraft] =
    React.useState<DeviceProfileDraft | null>(null);

  const [savingDevice, setSavingDevice] = React.useState(false);

  const [deviceSaveError, setDeviceSaveError] =
    React.useState<string | null>(null);

  const [selectedDeviceId, setSelectedDeviceId] =
    React.useState<string | null>(null);


  function beginEditingDevice(): void {
    if (!selectedDevice) {
      return;
    }

    setDeviceDraft({
      name: selectedDevice.name,
      manufacturer: selectedDevice.manufacturer,
      model: selectedDevice.model,
      firmwareVersion: selectedDevice.firmwareVersion,
      owner: selectedDevice.owner,
      totalFlightHours: selectedDevice.totalFlightHours,
      missionsCompleted: selectedDevice.missionsCompleted
    });

    setDeviceSaveError(null);
    setEditingDevice(true);
  }

  function cancelEditingDevice(): void {
    setEditingDevice(false);
    setDeviceDraft(null);
    setDeviceSaveError(null);
  }

  function updateDeviceDraft<K extends keyof DeviceProfileDraft>(
    field: K,
    value: DeviceProfileDraft[K]
  ): void {
    setDeviceDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value
      };
    });
  }

  async function saveDeviceProfile(): Promise<void> {
    if (!selectedDevice || !deviceDraft || savingDevice) {
      return;
    }

    setSavingDevice(true);
    setDeviceSaveError(null);

    try {
      const response = await fetch(
        `${gatewayUrl}/api/devices/${encodeURIComponent(selectedDevice.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(deviceDraft)
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.message ?? `Device update failed with status ${response.status}.`
        );
      }

      const updatedDevice = payload.device as RegisteredDevice;

      setDevices((current) =>
        current
          .map((device) =>
            device.id === updatedDevice.id ? updatedDevice : device
          )
          .sort((first, second) => first.name.localeCompare(second.name))
      );

      setEditingDevice(false);
      setDeviceDraft(null);
    } catch (error) {
      setDeviceSaveError(
        error instanceof Error
          ? error.message
          : "The device profile could not be saved."
      );
    } finally {
      setSavingDevice(false);
    }
  }

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
        setSelectedDroneId(
          (current) => current ?? items[0].telemetry.droneId
        );
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

        return {
          ...current,
          [droneId]: [...currentTrail, nextPoint].slice(-MAX_TRAIL_POINTS)
        };
      });

      setSelectedDroneId((current) => current ?? droneId);
      setLastEventAt(new Date().toLocaleTimeString());
    }



    function handleRegistrySnapshot(payload: RegistrySnapshotPayload) {
      setDevices(
        [...payload.devices].sort((first, second) =>
          first.name.localeCompare(second.name)
        )
      );
    }

    function handleDeviceUpdated(payload: DeviceUpdatedPayload) {
      setDevices((current) => {
        const remainingDevices = current.filter(
          (device) => device.id !== payload.device.id
        );

        return [...remainingDevices, payload.device].sort((first, second) =>
          first.name.localeCompare(second.name)
        );
      });
    }

    function handleDeviceDeleted(payload: DeviceDeletedPayload) {
      setDevices((current) =>
        current.filter((device) => device.id !== payload.deviceId)
      );
    }

    async function loadRegistry() {
      try {
        const response = await fetch(`${gatewayUrl}/api/devices`);

        if (!response.ok) {
          throw new Error(
            `Registry request failed with status ${response.status}.`
          );
        }

        const payload = (await response.json()) as RegistrySnapshotPayload;

        handleRegistrySnapshot(payload);
      } catch (error) {
        console.error("Unable to load Falcon device registry:", error);
      }
    }

    void loadRegistry();

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("fleet:snapshot", handleSnapshot);
    socket.on("telemetry:update", handleTelemetry);
    socket.on("registry:snapshot", handleRegistrySnapshot);
    socket.on("device:updated", handleDeviceUpdated);
    socket.on("device:deleted", handleDeviceDeleted);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("fleet:snapshot", handleSnapshot);
      socket.off("telemetry:update", handleTelemetry);
      socket.off("registry:snapshot", handleRegistrySnapshot);
      socket.off("device:updated", handleDeviceUpdated);
      socket.off("device:deleted", handleDeviceDeleted);
    };
  }, []);

  const drones = Object.values(fleet).sort((first, second) =>
    first.telemetry.droneId.localeCompare(second.telemetry.droneId)
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

  const selectedDevice =
    devices.find((device) => device.id === selectedDeviceId) ?? null;

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
              const isSelected = selectedDroneId === telemetry.droneId;

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
                          {formatNumber(telemetry.power.batteryPercent)}%
                        </span>

                        <span>
                          Altitude:{" "}
                          {formatNumber(telemetry.position.altitudeM)} m
                        </span>

                        <span>
                          Speed: {formatNumber(telemetry.motion.speedMps)} m/s
                        </span>

                        <span>
                          Latency: {formatNumber(latencyMs ?? 0, 0)} ms
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
                  <span className="drone-label">SELECTED AIRCRAFT</span>
                  <h3>{selectedDrone.telemetry.droneId}</h3>
                </div>

                <span
                  className={`mode mode-${selectedDrone.telemetry.flightMode.toLowerCase()}`}
                >
                  {selectedDrone.telemetry.flightMode.replaceAll("_", " ")}
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
                    {formatNumber(selectedDrone.telemetry.power.voltageV)} V
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
                    {formatNumber(selectedDrone.telemetry.motion.speedMps)} m/s
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
                  {selectedDrone.telemetry.position.latitude.toFixed(6)},{" "}
                  {selectedDrone.telemetry.position.longitude.toFixed(6)}
                </strong>
              </div>

              <div className="alerts">
                {selectedDrone.alerts.length === 0 ? (
                  <span className="nominal">All systems nominal</span>
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

      <section className="section-heading registry-heading">
        <div>
          <p className="eyebrow">DEVICE MANAGEMENT</p>
          <h2>Fleet Registry</h2>
        </div>

        <span className="registry-count">
          {devices.length} Registered
        </span>
      </section>

      <section className="registry-grid">
        {devices.length === 0 ? (
          <article className="empty-state">
            Waiting for devices to register through MQTT telemetry.
          </article>
        ) : (
          devices.map((device) => (
            <article
              className={`registry-card registry-card-${device.status.toLowerCase()}`}
              key={device.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedDroneId(device.id);
                setSelectedDeviceId(device.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedDroneId(device.id);
                  setSelectedDeviceId(device.id);
                }
              }}
            >
              <header className="registry-header">
                <div>
                  <span className="drone-label">REGISTERED DEVICE</span>
                  <h3>{device.name}</h3>
                  <small>{device.serialNumber}</small>
                </div>

                <span
                  className={`registry-status ${device.status === "ONLINE"
                    ? "registry-online"
                    : "registry-offline"
                    }`}
                >
                  <i />
                  {device.status}
                </span>
              </header>

              <div className="registry-stats">
                <div>
                  <span>Health</span>
                  <strong>{device.healthScore}%</strong>
                </div>

                <div>
                  <span>Firmware</span>
                  <strong>{device.firmwareVersion}</strong>
                </div>

                <div>
                  <span>Model</span>
                  <strong>{device.model}</strong>
                </div>

                <div>
                  <span>Telemetry</span>
                  <strong>{device.telemetryCount}</strong>
                </div>
              </div>

              <footer className="registry-footer">
                <div>
                  <span>Owner</span>
                  <strong>{device.owner}</strong>
                </div>

                <div>
                  <span>Last Seen</span>
                  <strong>{formatLastSeen(device.lastSeenAt)}</strong>
                </div>
              </footer>
            </article>
          ))
        )}
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
              className={`drone-card ${selectedDroneId === telemetry.droneId
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
                    {formatNumber(telemetry.health.signalDbm, 0)} dBm
                  </strong>
                </div>

                <div>
                  <span>Temperature</span>
                  <strong>
                    {formatNumber(telemetry.health.temperatureC)}°C
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

      {selectedDevice && (
        <div
          className="device-drawer-backdrop"
          role="presentation"
          onClick={() => {
            cancelEditingDevice();
            setSelectedDeviceId(null);
          }}
        >
          <aside
            className="device-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="device-profile-title"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <header className="device-drawer-header">
              <div>
                <p className="eyebrow">DEVICE PROFILE</p>
                <h2 id="device-profile-title">{selectedDevice.name}</h2>
                <span className="device-serial">
                  {selectedDevice.serialNumber}
                </span>
              </div>

              <div className="device-drawer-actions">
                {!editingDevice && (
                  <button
                    className="device-edit-button"
                    type="button"
                    onClick={beginEditingDevice}
                  >
                    Edit Profile
                  </button>
                )}

                <button
                  className="device-drawer-close"
                  type="button"
                  aria-label="Close device profile"
                  onClick={() => {
                    cancelEditingDevice();
                    setSelectedDeviceId(null);
                  }}
                >
                  ×
                </button>
              </div>

            </header>

            <div className="device-profile-status">
              <span
                className={`registry-status ${selectedDevice.status === "ONLINE"
                  ? "registry-online"
                  : "registry-offline"
                  }`}
              >
                <i />
                {selectedDevice.status}
              </span>

              <span
                className={`device-health device-health-${selectedDevice.healthState.toLowerCase()}`}
              >
                {selectedDevice.healthState}
              </span>

              <strong>{selectedDevice.healthScore}% Health</strong>
            </div>

            <section className="device-profile-section">
              <div className="device-profile-heading">
                <span>IDENTITY</span>
              </div>

              {editingDevice && deviceDraft ? (
                <div className="device-edit-form">
                  <label>
                    <span>Device Name</span>
                    <input
                      value={deviceDraft.name}
                      onChange={(event) => {
                        updateDeviceDraft("name", event.target.value);
                      }}
                    />
                  </label>

                  <label>
                    <span>Manufacturer</span>
                    <input
                      value={deviceDraft.manufacturer}
                      onChange={(event) => {
                        updateDeviceDraft("manufacturer", event.target.value);
                      }}
                    />
                  </label>

                  <label>
                    <span>Model</span>
                    <input
                      value={deviceDraft.model}
                      onChange={(event) => {
                        updateDeviceDraft("model", event.target.value);
                      }}
                    />
                  </label>

                  <label>
                    <span>Firmware Version</span>
                    <input
                      value={deviceDraft.firmwareVersion}
                      onChange={(event) => {
                        updateDeviceDraft(
                          "firmwareVersion",
                          event.target.value
                        );
                      }}
                    />
                  </label>

                  <label>
                    <span>Owner</span>
                    <input
                      value={deviceDraft.owner}
                      onChange={(event) => {
                        updateDeviceDraft("owner", event.target.value);
                      }}
                    />
                  </label>

                  <label>
                    <span>Flight Hours</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={deviceDraft.totalFlightHours}
                      onChange={(event) => {
                        updateDeviceDraft(
                          "totalFlightHours",
                          Number(event.target.value)
                        );
                      }}
                    />
                  </label>

                  <label>
                    <span>Missions Completed</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={deviceDraft.missionsCompleted}
                      onChange={(event) => {
                        updateDeviceDraft(
                          "missionsCompleted",
                          Number(event.target.value)
                        );
                      }}
                    />
                  </label>

                  {deviceSaveError && (
                    <p className="device-save-error">
                      {deviceSaveError}
                    </p>
                  )}

                  <div className="device-edit-actions">
                    <button
                      className="device-cancel-button"
                      type="button"
                      disabled={savingDevice}
                      onClick={cancelEditingDevice}
                    >
                      Cancel
                    </button>

                    <button
                      className="device-save-button"
                      type="button"
                      disabled={savingDevice}
                      onClick={() => {
                        void saveDeviceProfile();
                      }}
                    >
                      {savingDevice ? "Saving..." : "Save Profile"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="device-detail-grid">
                  <div>
                    <span>Device ID</span>
                    <strong>{selectedDevice.id}</strong>
                  </div>

                  <div>
                    <span>Manufacturer</span>
                    <strong>{selectedDevice.manufacturer}</strong>
                  </div>

                  <div>
                    <span>Model</span>
                    <strong>{selectedDevice.model}</strong>
                  </div>

                  <div>
                    <span>Firmware</span>
                    <strong>{selectedDevice.firmwareVersion}</strong>
                  </div>

                  <div>
                    <span>Owner</span>
                    <strong>{selectedDevice.owner}</strong>
                  </div>

                  <div>
                    <span>Telemetry Messages</span>
                    <strong>{selectedDevice.telemetryCount}</strong>
                  </div>
                </div>
              )}
            </section>

            <section className="device-profile-section">
              <div className="device-profile-heading">
                <span>LIVE OPERATIONS</span>
              </div>

              <div className="device-detail-grid">
                <div>
                  <span>Battery</span>
                  <strong>
                    {formatNumber(
                      selectedDevice.latestTelemetry.battery
                    )}
                    %
                  </strong>
                </div>

                <div>
                  <span>Voltage</span>
                  <strong>
                    {formatNumber(
                      selectedDevice.latestTelemetry.voltage
                    )}{" "}
                    V
                  </strong>
                </div>

                <div>
                  <span>Altitude</span>
                  <strong>
                    {formatNumber(
                      selectedDevice.latestTelemetry.altitude
                    )}{" "}
                    m
                  </strong>
                </div>

                <div>
                  <span>Speed</span>
                  <strong>
                    {formatNumber(
                      selectedDevice.latestTelemetry.speed
                    )}{" "}
                    m/s
                  </strong>
                </div>

                <div>
                  <span>Signal</span>
                  <strong>
                    {formatNumber(
                      selectedDevice.latestTelemetry.signalStrength,
                      0
                    )}{" "}
                    dBm
                  </strong>
                </div>

                <div>
                  <span>Temperature</span>
                  <strong>
                    {formatNumber(
                      selectedDevice.latestTelemetry.temperature
                    )}
                    °C
                  </strong>
                </div>
              </div>

              <div className="device-position">
                <span>CURRENT POSITION</span>
                <strong>
                  {selectedDevice.latestTelemetry.latitude.toFixed(6)},{" "}
                  {selectedDevice.latestTelemetry.longitude.toFixed(6)}
                </strong>
              </div>
            </section>

            <section className="device-profile-section">
              <div className="device-profile-heading">
                <span>DEVICE SENSORS</span>
              </div>

              <div className="sensor-list">
                {selectedDevice.sensors.map((sensor) => (
                  <span key={sensor}>{sensor}</span>
                ))}
              </div>
            </section>

            <section className="device-profile-section">
              <div className="device-profile-heading">
                <span>LIFECYCLE</span>
              </div>

              <div className="device-lifecycle">
                <div>
                  <span>First Seen</span>
                  <strong>
                    {new Date(
                      selectedDevice.firstSeenAt
                    ).toLocaleString()}
                  </strong>
                </div>

                <div>
                  <span>Last Seen</span>
                  <strong>
                    {formatLastSeen(selectedDevice.lastSeenAt)}
                  </strong>
                </div>

                <div>
                  <span>Flight Hours</span>
                  <strong>
                    {formatNumber(selectedDevice.totalFlightHours)}
                  </strong>
                </div>

                <div>
                  <span>Missions Completed</span>
                  <strong>{selectedDevice.missionsCompleted}</strong>
                </div>
              </div>
            </section>
          </aside>
        </div>
      )}

    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);