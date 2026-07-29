# Project Falcon

<p align="center">
  <img src="./docs/screenshot.png" alt="Project Falcon Mission Control Dashboard" width="100%" />
</p>

> **Mission Control for Connected Devices**

<p align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)
![MQTT](https://img.shields.io/badge/MQTT-5-660066?logo=eclipsemosquitto)
![gRPC](https://img.shields.io/badge/gRPC-Microservices-244C5A?logo=grpc)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-010101?logo=socketdotio)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker)
![Leaflet](https://img.shields.io/badge/Leaflet-Live%20Maps-199900?logo=leaflet)
![Azure](https://img.shields.io/badge/Azure-IoT%20Ready-0078D4?logo=microsoftazure)
![License](https://img.shields.io/badge/License-MIT-green)

</p>

---

# Overview

Project Falcon is a production-oriented IoT operations platform for monitoring, managing, and analyzing fleets of connected devices in real time.

Built around an event-driven architecture, Falcon combines MQTT messaging, gRPC microservices, WebSocket streaming, a centralized Device Registry, and a React Mission Control dashboard to deliver low-latency telemetry visualization, operational awareness, and live fleet management.

While the current implementation simulates autonomous drones, the underlying architecture is designed to support virtually any connected device, including robotics, autonomous vehicles, industrial equipment, environmental sensors, manufacturing equipment, and embedded systems.

---

# Key Features

- Real-time IoT telemetry processing
- Automatic device discovery and registration
- Fleet registry and device management
- Interactive device profiles
- Live profile editing
- MQTT event-driven messaging
- gRPC microservice architecture
- WebSocket streaming without polling
- Interactive Mission Control dashboard
- Live fleet map with Leaflet
- Flight trail visualization
- Dockerized development environment
- TypeScript throughout the platform
- Azure cloud migration roadmap

---

# System Architecture

```text
                 Drone Simulator
                        │
                  MQTT Telemetry
                        │
                Eclipse Mosquitto
                        │
                        ▼
              Telemetry Gateway
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
  gRPC Alert Service             Device Registry
        │                               │
        └───────────────┬───────────────┘
                        ▼
                Socket.IO Gateway
                        │
                        ▼
         React Mission Control Dashboard
```

---

# Technology Stack

## Frontend

- React 19
- TypeScript
- Leaflet
- Socket.IO Client

## Backend

- Node.js
- Express
- MQTT
- gRPC
- Protocol Buffers
- Socket.IO

## Infrastructure

- Docker
- Docker Compose
- Eclipse Mosquitto
- npm Workspaces

## Planned Cloud Platform

- Azure IoT Hub
- Azure Container Apps
- Azure Monitor
- Azure Event Hubs
- Azure Device Twins

---

# Current Capabilities

## Real-Time Telemetry

Each connected aircraft continuously publishes:

- GPS Position
- Heading
- Speed
- Altitude
- Battery Level
- Voltage
- Signal Strength
- Temperature
- Flight Mode

---

## Mission Control Dashboard

The operations dashboard provides:

- Live fleet map
- Aircraft selection
- Flight trail visualization
- Fleet telemetry
- Gateway latency
- Active alerts
- Connection monitoring
- Operational overview

---

## Fleet Registry

The integrated Device Registry provides:

- Automatic device discovery
- Fleet inventory
- Device registration
- Device profiles
- Firmware tracking
- Ownership management
- Health scoring
- Online and offline detection
- Live profile editing

---

## Alert Processing

A dedicated gRPC microservice independently evaluates incoming telemetry and generates operational alerts.

Current alert conditions include:

- Low Battery
- Critical Battery
- Weak Signal
- Critical Signal
- Elevated Temperature
- Critical Temperature

---

# Local Development

Install dependencies

```bash
npm install
```

Build all workspaces

```bash
npm run build
```

Start the platform

```bash
docker compose up --build
```

Mission Control Dashboard

```text
http://localhost:5173
```

Gateway Health Endpoint

```text
http://localhost:5050/api/health
```

---

# Project Roadmap

## Phase 1 ✅ Core Platform

- MQTT Messaging
- Docker Infrastructure
- gRPC Services
- WebSocket Streaming
- React Dashboard
- Drone Simulator

## Phase 2 ✅ Mission Control

- Interactive Fleet Map
- Flight Trail Visualization
- Aircraft Selection
- Fleet Telemetry
- Operational Dashboard

## Phase 3 ✅ Device Management

- Device Registry
- Fleet Management
- Device Profiles
- Firmware Tracking
- Online and Offline Detection
- Live Profile Editing

## Phase 4 🚧 Persistence

- MongoDB Integration
- Historical Telemetry
- Mission Replay
- Incident Timeline
- Maintenance History
- Fleet Analytics

## Phase 5

- Azure IoT Hub
- Azure Container Apps
- Azure Monitor
- Azure Event Hubs
- Azure Device Twins
- Production Deployment

## Phase 6

- AI Mission Summaries
- Predictive Maintenance
- Battery Forecasting
- Fleet Intelligence
- Digital Twin Integration

---

# Enterprise Engineering Principles

Project Falcon demonstrates modern enterprise software engineering practices, including:

- Event-driven architecture
- Publish and subscribe messaging
- Microservice communication
- Real-time WebSocket streaming
- Device Registry pattern
- Operational dashboard design
- Containerized deployment
- Strong TypeScript typing
- Cloud-native architecture
- Operational observability
- Scalable system design

---

# Repository Structure

```text
project-falcon/
│
├── apps/
│   ├── dashboard/
│   ├── gateway/
│   ├── simulator/
│   └── alert-service/
│
├── packages/
│
├── docs/
│   ├── screenshot.png
│   ├── architecture.png
│   └── roadmap.md
│
├── docker-compose.yml
├── package.json
└── README.md
```

---

# Future Vision

Project Falcon is being designed as a cloud-native IoT operations platform capable of supporting industrial fleets at scale.

Future releases will introduce persistent fleet storage, historical telemetry, cloud-native messaging, enterprise monitoring, predictive analytics, and AI-assisted operational intelligence while maintaining the event-driven architecture established in the current platform.

---

# License

MIT