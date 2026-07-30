# Getting Started

## Welcome to Falcon

Welcome to the Falcon platform.

Falcon is a cloud-native autonomous systems platform designed to provide real-time aircraft control, telemetry monitoring, operational visibility, and scalable messaging infrastructure.

This guide introduces the core components and helps you begin working with the platform.

---

# Platform Components

Falcon currently consists of:

• Drone Console

• Falcon Gateway

• Native Drone Client

• Flight Simulator

• HiveMQ Cloud

• Observation Lounge

Each component performs a specific role within the overall system.

---

# Prerequisites

Before using Falcon, ensure the following are available:

• Node.js

• npm

• Git

• Internet connectivity

• HiveMQ Cloud credentials

• Configured environment variables

---

# Clone the Repository

```bash
git clone <repository-url>

cd falcon
```

---

# Install Dependencies

```bash
npm install
```

Repeat for each service as required.

---

# Configure Environment Variables

Create the required environment file for each service.

Typical values include:

• MQTT broker

• MQTT credentials

• Gateway URL

• Service ports

---

# Start the Services

Typical startup sequence:

1. HiveMQ Cloud
2. Falcon Gateway
3. Native Drone Client
4. Flight Simulator
5. Drone Console
6. Observation Lounge

---

# Verify Operation

Confirm:

• Gateway is running

• Drone Client is connected

• MQTT broker is connected

• Telemetry is updating

• Commands execute successfully

---

# Next Steps

Continue with:

Drone Console Guide

Mission Management

Troubleshooting Guide

---

# Summary

You are now ready to begin operating and developing the Falcon platform.