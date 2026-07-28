# Project Falcon

A low-latency IoT drone telemetry lab built to demonstrate:

- MQTT device telemetry
- gRPC service-to-service communication
- WebSocket browser updates
- React operations dashboard
- Dockerized local architecture
- A clean migration path to Azure IoT Hub

## Architecture

```text
Simulator -> MQTT -> Gateway -> Socket.IO -> React Dashboard
                         |
                         +---- gRPC ----> Alert Service
```

The current implementation simulates multiple drones, publishes telemetry every 500 ms,
validates each message, evaluates alerts over gRPC, measures latency, and streams updates to
the browser without polling.

## Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop

## Fastest start

```bash
docker compose up --build
```

Open:

```text
http://localhost:5173
```

Gateway health:

```text
http://localhost:5050/api/health
```

## Local development

Install dependencies:

```bash
npm install
```

Start Mosquitto:

```bash
docker compose up mosquitto
```

Use four terminals:

```bash
npm run dev:alerts
npm run dev:gateway
npm run dev:simulator
npm run dev:dashboard
```

## MQTT topics

```text
falcon/drones/{droneId}/telemetry
```

The gateway subscribes with:

```text
falcon/drones/+/telemetry
```

## First engineering exercises

1. Change `SIMULATOR_INTERVAL_MS` from 500 to 100 and compare latency.
2. Change MQTT QoS from 0 to 1 and discuss the delivery/overhead tradeoff.
3. Trigger low-battery alerts by reducing initial battery values.
4. Stop the simulator and add stale-device detection in the gateway.
5. Persist telemetry to MongoDB.
6. Replace Mosquitto with Azure IoT Hub.
7. Add a UDP position-ingest adapter and benchmark it against MQTT.

## Security note

The local Mosquitto broker allows anonymous access for development only. Production must use
TLS, authenticated device identities, authorization, secret management, and network controls.
