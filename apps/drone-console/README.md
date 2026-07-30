# Falcon Drone Console

<p align="center">
  <img src="./docs/screenshot.png" alt="Falcon Drone Console" width="100%" />
</p>

> **Real-Time UAV Ground Control Station**

<h1 align="center">
Falcon Drone Console
</h1>

<h3 align="center">
Professional Browser-Based Command and Control for Autonomous Aircraft
</h3>

<p align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-010101?logo=socketdotio)
![MQTT](https://img.shields.io/badge/MQTT-Messaging-660066?logo=eclipsemosquitto)
![C++](https://img.shields.io/badge/C%2B%2B-20-00599C?logo=cplusplus)
![License](https://img.shields.io/badge/License-MIT-green)

</p>

<p align="center">
  <img src="./public/falcon-icon.png" alt="Falcon Logo" width="180" />
</p>

---

# Overview

Falcon Drone Console is a professional browser-based ground control station for the Falcon autonomous flight platform.

Built with React, TypeScript, Vite, and Socket.IO, the console provides operators with live aircraft telemetry, guided flight controls, mission management, and real-time command acknowledgements through a modern browser interface.

The application communicates with the Falcon Gateway, which securely forwards commands over MQTT to a native C++ flight controller while streaming live telemetry back to the operator.

Falcon is deployed as a distributed cloud platform consisting of independently deployed frontend, gateway, simulator, messaging, and flight controller services.---

# Features

### Real-Time Telemetry

Monitor aircraft status in real time.

* Live altitude
* Heading
* Speed
* Battery percentage
* Voltage
* GPS status
* Signal strength
* Temperature
* Flight mode
* Last transmission time

---


# Deployment

Falcon is deployed as a distributed cloud application.

### Frontend

* Netlify
* React
* TypeScript
* Vite

### Backend Services

* Falcon Gateway (Render)
* Falcon Drone Client (Render)
* Falcon Flight Simulator (Render)

### Messaging

* HiveMQ Cloud MQTT

The deployed services communicate through secure Socket.IO and MQTT connections to provide real-time command and telemetry streaming.

---

### Guided Flight Control

Control the aircraft directly from the browser.

Current capabilities include:

* Guided altitude changes
* Guided heading changes
* Smooth climb and descent
* Shortest-path heading rotation
* Immediate command acknowledgement

---

### Mission Commands

Supported flight commands include:

* Start Mission
* Pause Mission
* Resume Mission
* Hover
* Return to Home
* Land

Each command is acknowledged by the gateway and logged within the activity panel.

---

### Aircraft Status

The console continuously monitors:

* Connection status
* Aircraft online/offline state
* Telemetry health
* Gateway connectivity
* Flight mode
* Activity history

Telemetry timeouts automatically detect aircraft communication loss.

---


# Current Capabilities

The current Falcon platform supports:

* Live telemetry streaming
* Browser-based flight control
* Guided altitude changes
* Guided heading changes
* Autonomous mission execution
* Return-to-home operations
* Landing procedures
* Real-time activity logging
* Gateway acknowledgements
* Cloud deployment across multiple services
* Native C++ flight simulation

---

# System Architecture

---

                                 Falcon Platform

      +------------------------------+
      |      Drone Console           |
      |  React + TypeScript          |
      |        Netlify              |
      +--------------+---------------+
                     |
                 Socket.IO
                     |
      +--------------v---------------+
      |      Falcon Gateway          |
      |         Node.js              |
      |          Render              |
      +--------------+---------------+
                     |
                   MQTT
                     |
      +--------------v---------------+
      |      HiveMQ Cloud Broker     |
      +--------------+---------------+
                     |
      +--------------v---------------+
      | Native C++ Flight Controller |
      |          Render              |
      +--------------+---------------+
                     |
             Live Telemetry Stream

---

# Command Flow


Operator

     ↓

Drone Console

     ↓

Socket.IO

     ↓

Falcon Gateway

     ↓

MQTT

     ↓

Native C++ Drone

     ↓

Telemetry

     ↓

Drone Console

---


# Cloud Architecture

Falcon is designed as a distributed service-oriented platform.

Current production deployment includes:

* 3 Render services
* 2 Netlify applications
* HiveMQ Cloud MQTT messaging
* Native C++ flight controller
* Browser-based ground control station
* Real-time telemetry streaming
* Socket.IO command routing

---

# Flight Command Matrix

| Capability                  | Status |
| --------------------------- | :----: |
| Connect to Gateway          |    ✅   |
| Live Telemetry              |    ✅   |
| Aircraft Online Detection   |    ✅   |
| Activity Log                |    ✅   |
| Start Mission               |    ✅   |
| Pause Mission               |    ✅   |
| Resume Mission              |    ✅   |
| Hover                       |    ✅   |
| Return To Home              |    ✅   |
| Land                        |    ✅   |
| Guided Altitude             |    ✅   |
| Guided Heading              |    ✅   |
| Gateway Acknowledgements    |    ✅   |
| Telemetry Timeout Detection |    ✅   |

---

# Technology Stack

## Frontend

* React 19
* TypeScript
* Vite
* Socket.IO Client
* CSS

## Backend Integration

* Falcon Gateway
* Socket.IO
* MQTT Messaging

## Flight Platform

* Native C++ Flight Controller
* Real-Time Telemetry
* Guided Flight Engine

---

# User Interface

The Drone Console is organized into four operational panels.

## Aircraft Identity

Displays:

* Drone ID
* Connection status
* Flight mode
* Telemetry status
* Last transmission
* Connect / Disconnect controls

---

## Live Telemetry

Displays real-time aircraft information including:

* Altitude
* Heading
* Battery
* Speed
* GPS
* Signal
* Temperature
* Voltage

---

## Flight Controls

Provides browser-based command controls including:

* Altitude slider
* Heading slider
* Mission controls
* Hover
* Return to Home
* Land

---

## Activity Log

Displays chronological operational events including:

* Connection events
* Gateway acknowledgements
* Flight commands
* Telemetry events
* System notifications

---

# Project Structure


src/

 ├── App.tsx
 ├── App.css
 ├── main.tsx

public/

 ├── falcon-icon.png

docs/

 ├── screenshot.png


---

# Getting Started

Clone the repository.

```bash
git clone <repository-url>
```

Install dependencies.

```bash
npm install
```

Start the development server.

```bash
npm run dev
```

Create a production build.

```bash
npm run build
```

Preview the production build.

```bash
npm run preview
```

---

# Environment Variables

```env
VITE_GATEWAY_URL=http://localhost:5050
```

---

# Screenshots

Main application interface.

```text
docs/screenshot.png
```

Application icon.

```text
public/falcon-icon.png
```

---

# Roadmap

Upcoming capabilities include:

* Fleet management
* Multi-aircraft operations
* Live mapping
* Waypoint navigation
* Mission planning
* Geofencing
* Flight replay
* Incident reporting
* Observation Lounge integration
* Mission recording
* Autonomous patrol routes

---

## Related Projects

* Falcon Gateway
* Native C++ Falcon Drone
* Falcon Flight Simulator
* Observation Lounge
* Falcon MQTT Infrastructure

Together these services form the Falcon autonomous command-and-control platform and provide real-time operational visibility across the deployed system.
---

# License

Released under the MIT License.
