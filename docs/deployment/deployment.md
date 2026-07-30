# Falcon Deployment Guide

## Overview

Falcon is deployed as a distributed cloud platform consisting of independently managed frontend, backend, messaging, and simulation services.

Each service has a dedicated responsibility and can be deployed, updated, monitored, and restarted without affecting the remainder of the platform.

The deployment model emphasizes scalability, resiliency, and operational observability.

---

# Production Deployment

The current Falcon platform consists of six primary services.

| Service | Platform | Status |
|----------|----------|--------|
| Drone Console | Netlify | Production |
| Mission Dashboard | Netlify | Production |
| Falcon Gateway | Render | Production |
| Native Drone Client | Render | Production |
| Flight Simulator | Render | Production |
| HiveMQ Cloud | Managed MQTT | Production |

---

# Deployment Architecture

                    Internet

                         │

          +------------------------------+
          |         Netlify              |
          +------------------------------+

              Drone Console
                     │
                     │
             Socket.IO (TLS)
                     │

          +------------------------------+
          |          Render              |
          +------------------------------+

              Falcon Gateway
                     │
                     │
                 MQTT over TLS
                     │

          +------------------------------+
          |       HiveMQ Cloud           |
          +------------------------------+

             MQTT Broker
                │      │
                │      │
      +---------+      +----------+
      │                           │

Native Drone Client      Flight Simulator
(Render)                 (Render)

---

# Service Responsibilities

## Drone Console

Platform

Netlify

Responsibilities

• Browser-based operator interface

• Aircraft telemetry display

• Flight controls

• Activity logging

• Gateway communications

---

## Mission Dashboard

Platform

Netlify

Responsibilities

• Fleet overview

• Aircraft monitoring

• Operational metrics

• Future fleet management

---

## Falcon Gateway

Platform

Render

Responsibilities

• Socket.IO server

• MQTT bridge

• Command routing

• Telemetry distribution

• Fleet synchronization

---

## Native Drone Client

Platform

Render

Responsibilities

• Aircraft state management

• Flight control

• Guidance engine

• Telemetry publishing

• Mission execution

---

## Flight Simulator

Platform

Render

Responsibilities

• Simulated aircraft

• Development testing

• Mission validation

• Telemetry generation

---

## HiveMQ Cloud

Platform

Managed MQTT

Responsibilities

• Publish/Subscribe messaging

• Aircraft discovery

• Command delivery

• Telemetry routing

• Retained aircraft status

---

# Communication Flow

Operator

↓

Drone Console

↓

Socket.IO

↓

Falcon Gateway

↓

HiveMQ Cloud

↓

Native Drone Client

↓

Telemetry

↓

Falcon Gateway

↓

Drone Console

---

# Deployment Strategy

Every Falcon component is deployed independently.

Advantages include:

• Zero dependency between frontend deployments

• Independent backend updates

• Independent simulator updates

• Service isolation

• Reduced downtime

• Simplified debugging

• Scalable architecture

---

# Environment Configuration

Each deployment maintains its own environment variables.

Examples include:

• MQTT credentials

• Gateway URLs

• Render configuration

• Netlify configuration

• Service identifiers

No secrets are stored within the application source code.

---

# High Availability

Falcon is designed around distributed services.

Individual services can be restarted without requiring a complete platform shutdown.

This architecture allows:

• Rolling deployments

• Independent maintenance

• Service recovery

• Future horizontal scaling

---

# Monitoring

Operational visibility is provided through:

• Health endpoints

• Gateway logging

• MQTT status monitoring

• Aircraft telemetry

• Command acknowledgements

• Observation Lounge integration

---

# Future Deployment Goals

Planned deployment enhancements include:

• Multi-region deployments

• Automatic failover

• Fleet scaling

• High availability gateways

• Continuous deployment pipelines

• Containerized deployments

• Kubernetes support

• Edge-based aircraft gateways

---

# Summary

The Falcon deployment architecture separates presentation, communications, messaging, and flight control into independent cloud services.

This approach provides a scalable foundation for autonomous aircraft operations while supporting future expansion into multi-aircraft fleet management and enterprise deployments.