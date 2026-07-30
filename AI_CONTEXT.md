# Falcon AI Context

## Purpose

Falcon is a production-oriented IoT fleet management platform for monitoring, controlling, and analyzing connected devices through a modern event-driven architecture.

Although the current implementation simulates autonomous aircraft, Falcon is architected as a generic IoT platform capable of supporting robotics, industrial equipment, autonomous vehicles, embedded systems, sensors, and future connected infrastructure.

---

# Project Goals

Primary goals:

- Real-time telemetry processing
- Event-driven messaging
- Persistent fleet management
- Operational observability
- Cloud-native architecture
- Production engineering practices

The project is intended to demonstrate enterprise software architecture rather than a single-purpose drone application.

---

# Architecture

Core technologies:

React
TypeScript
Node.js
Express
MQTT
Socket.IO
MongoDB
Mongoose
Docker
gRPC

Architecture style:

Event-driven microservices

Telemetry

Simulator

↓

MQTT Broker

↓

Gateway

↓

Device Registry

↓

MongoDB

↓

Socket.IO

↓

React Dashboard

---

# Major Services

## Dashboard

Responsibilities:

- Mission Control UI
- Fleet monitoring
- Maps
- Device profiles
- Fleet status
- Telemetry visualization

---

## Gateway

Responsibilities:

- MQTT subscriptions
- Telemetry processing
- Device Registry synchronization
- WebSocket broadcasting
- API endpoints

---

## Device Registry

Responsibilities:

- Fleet persistence
- Device metadata
- Health scoring
- Online/offline tracking
- Fleet rehydration

---

## Alert Service

Responsibilities:

- Telemetry analysis
- Threshold detection
- Alert generation

---

## Simulator

Responsibilities:

- Aircraft simulation
- Telemetry generation
- MQTT publishing

---

# Current Features

Completed

- MQTT messaging
- Device Registry
- MongoDB persistence
- Fleet rehydration
- Live telemetry
- Flight trails
- Interactive maps
- Device profiles
- Health scoring
- Dashboard
- Docker
- gRPC alerts

In Progress

- Historical telemetry
- Mission replay
- Fleet analytics

Planned

- Azure IoT Hub
- Azure Monitor
- AI mission summaries
- Predictive maintenance
- Digital twins

---

# Coding Standards

Use:

- TypeScript
- async/await
- Repository Pattern
- Strong typing
- Small reusable functions
- Functional React components
- Hooks

Avoid:

- any
- duplicated logic
- large files
- unnecessary abstractions

---

# Repository Structure

apps/
packages/
docs/

Documentation is located under:

docs/

Architecture

Engineering

API

Deployment

Operations

Security

Governance

Compliance

User Guide

Roadmap

Releases

---

# Design Philosophy

Falcon is built around these principles:

- Event-driven
- Observable
- Maintainable
- Testable
- Scalable
- Cloud-ready
- Documentation-first

---

# AI Guidelines

When assisting with this project:

Preserve existing architecture.

Prefer extending existing services rather than introducing new patterns.

Maintain TypeScript type safety.

Use Repository Pattern where persistence is involved.

Prefer reusable components.

Do not duplicate MQTT processing logic.

Maintain event-driven communication.

Follow existing naming conventions.

Update documentation when introducing new functionality.

Avoid introducing unnecessary dependencies.

---

# Documentation

Always consult the documentation before modifying architecture.

Important documentation:

docs/architecture/
docs/engineering/
docs/api/
docs/security/
docs/operations/

---

# Future Direction

Falcon is evolving toward an enterprise IoT operations platform capable of managing thousands of connected devices with cloud-native deployment, historical analytics, AI-assisted operational intelligence, predictive maintenance, and distributed fleet management.