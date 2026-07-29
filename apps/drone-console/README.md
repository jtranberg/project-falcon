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

Designed using React, TypeScript, and Socket.IO, the application provides operators with live aircraft telemetry, guided flight controls, mission management, and real-time command acknowledgements through a modern command interface.

The console communicates with the Falcon Gateway, which forwards commands through MQTT to a native C++ flight controller while streaming telemetry back to the browser.

---

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

# System Architecture

```text
                Falcon Platform

         +-------------------------+
         |   Drone Console         |
         | React + TypeScript      |
         +-----------+-------------+
                     |
               Socket.IO
                     |
         +-----------v-------------+
         |    Falcon Gateway       |
         |      Node.js            |
         +-----------+-------------+
                     |
                   MQTT
                     |
         +-----------v-------------+
         | Native C++ Flight Core  |
         |   Drone Controller      |
         +-----------+-------------+
                     |
            Live Telemetry Stream
```

---

# Command Flow

```text
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
```

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

```text
src/

 ├── App.tsx
 ├── App.css
 ├── main.tsx

public/

 ├── falcon-icon.png

docs/

 ├── screenshot.png
```

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

# Related Projects

* Falcon Gateway
* Native C++ Falcon Drone
* Falcon MQTT Infrastructure
* Observation Lounge

Together these applications form the Falcon autonomous command-and-control platform.

---

# License

Released under the MIT License.
