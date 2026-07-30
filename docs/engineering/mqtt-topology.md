# MQTT Topology

## Overview

Falcon uses MQTT as the primary messaging backbone between distributed platform services.

MQTT provides lightweight, low-latency publish/subscribe messaging while completely decoupling aircraft, browser clients, gateways, simulators, and future fleet management services.

HiveMQ Cloud serves as the central broker for all production messaging.

---

# Messaging Architecture

                   HiveMQ Cloud

                          │

      ┌──────────────┬───────────────┐
      │              │               │

 Falcon Gateway   Drone Client   Flight Simulator

      │

 Drone Console

---

# Design Principles

The Falcon messaging architecture is designed around:

• Low latency

• Loose coupling

• Service isolation

• Scalability

• Fault tolerance

• Cloud-native deployment

---

# Topic Structure

Falcon follows a hierarchical topic design.

falcon/

├── drone/

│   ├── {droneId}/

│   │   ├── telemetry

│   │   ├── command

│   │   ├── command-status

│   │   └── status

│

├── fleet/

│   ├── telemetry

│   ├── events

│   └── status

│

└── system/

    ├── alerts

    ├── health

    └── metrics

---

# Aircraft Topics

## Telemetry

Topic

falcon/drone/{droneId}/telemetry

Publisher

Native Drone Client

Subscribers

Falcon Gateway

Future analytics services

Purpose

Publishes aircraft telemetry at a fixed interval.

---

## Command

Topic

falcon/drone/{droneId}/command

Publisher

Falcon Gateway

Subscribers

Native Drone Client

Flight Simulator

Purpose

Delivers operator flight commands.

---

## Command Status

Topic

falcon/drone/{droneId}/command-status

Publisher

Native Drone Client

Subscribers

Falcon Gateway

Purpose

Reports command acknowledgements.

---

## Aircraft Status

Topic

falcon/drone/{droneId}/status

Publisher

Native Drone Client

Subscribers

Falcon Gateway

Observation Lounge

Purpose

Reports ONLINE and OFFLINE state.

Status messages are retained by the broker.

---

# Fleet Topics

Future fleet support will introduce:

falcon/fleet/telemetry

falcon/fleet/events

falcon/fleet/status

These topics will support:

• Fleet dashboards

• Fleet analytics

• Multi-aircraft operations

---

# System Topics

Future system topics include:

falcon/system/alerts

falcon/system/health

falcon/system/metrics

These topics are intended for platform monitoring and Observation Lounge integration.

---

# Quality of Service

Current messaging strategy:

Telemetry

QoS 0

Fast delivery with minimal overhead.

Commands

QoS 1

Guaranteed delivery.

Status

QoS 1

Retained.

---

# Retained Messages

Retained topics include:

Aircraft Status

ONLINE

OFFLINE

This allows newly connected services to immediately determine aircraft availability.

---

# Security

All MQTT communication uses:

• TLS encryption

• Username/password authentication

• Secure cloud broker

• Environment-managed credentials

---

# Future Enhancements

Planned messaging improvements include:

• Fleet broadcasts

• Wildcard subscriptions

• Shared subscriptions

• Mission topics

• Video streams

• Telemetry compression

• Priority messaging

• Swarm coordination

---

# Summary

MQTT provides the messaging backbone for the Falcon platform.

Its publish/subscribe architecture enables independent services to communicate efficiently while remaining loosely coupled and highly scalable.