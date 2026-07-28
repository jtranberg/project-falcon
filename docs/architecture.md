# Project Falcon Architecture

## Current local architecture

```text
Drone Simulator
  |
  | MQTT QoS 0 telemetry
  v
Mosquitto Broker
  |
  v
Telemetry Gateway
  |-- validates messages with Zod
  |-- measures device-to-gateway latency
  |-- calls Alert Service over gRPC
  |-- emits live events through Socket.IO
  |
  +------ gRPC ------> Alert Service
  |
  +------ WebSocket -> React Dashboard
```

## Why each protocol exists

### MQTT

MQTT is the device-to-platform transport. It keeps a persistent connection and uses
publish/subscribe topics, which is a natural fit for many devices and multiple consumers.

### gRPC

gRPC is used internally between backend services. The Protocol Buffer contract makes the
alert API explicit and gives us a clean path toward streaming RPCs later.

### WebSockets / Socket.IO

Browsers consume telemetry through a persistent low-latency connection rather than polling.
Socket.IO adds reconnection and fallback behavior around the browser connection.

### UDP

UDP is not included in the first implementation because this telemetry is operational and
should not silently disappear. A later lab can add a UDP ingest adapter for high-frequency,
loss-tolerant position samples and compare packet loss, latency, and recovery behavior.

## Planned production layers

1. MongoDB or Azure Cosmos DB persistence.
2. Redis cache for current fleet state.
3. Azure IoT Hub device identity and ingestion.
4. Event Hubs routing for high-volume stream processing.
5. Azure Container Apps for gateway and gRPC services.
6. Azure Monitor and Application Insights.
7. Device twins and cloud-to-device commands.
8. Authentication, authorization, TLS, and per-device credentials.
