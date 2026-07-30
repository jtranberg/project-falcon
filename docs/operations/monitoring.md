# Falcon Monitoring

## Overview

Continuous monitoring is essential to the Falcon platform.

Every major service exposes operational information that allows platform health, aircraft connectivity, and messaging performance to be observed in real time.

Monitoring data is aggregated through the Observation Lounge, providing operators and administrators with a centralized operational dashboard.

---

# Monitoring Objectives

The monitoring system is designed to provide visibility into:

• Platform availability

• Aircraft connectivity

• Gateway health

• MQTT connectivity

• Telemetry flow

• Command execution

• Fleet activity

• Service performance

---

# Monitored Services

Current production services include:

• Drone Console

• Falcon Gateway

• Native Drone Client

• Flight Simulator

• HiveMQ Cloud

• Observation Lounge

Each service exposes operational information independently.

---

# Health Monitoring

Every service should expose a health endpoint.

Example

/api/health

Typical response includes:

• Service name

• Version

• Status

• Uptime

• Timestamp

• Environment

• Dependencies

---

# Aircraft Monitoring

Each aircraft reports:

• ONLINE status

• OFFLINE status

• Flight mode

• Position

• Battery

• GPS

• Signal strength

• Last telemetry

Aircraft state is updated continuously through MQTT.

---

# Gateway Monitoring

The Falcon Gateway reports:

• MQTT connection

• Browser connections

• Active aircraft

• Command throughput

• Telemetry throughput

• System uptime

---

# Messaging Monitoring

MQTT monitoring includes:

• Broker connectivity

• Subscription status

• Publish success

• Retained status messages

• Reconnect attempts

---

# Telemetry Monitoring

Telemetry monitoring verifies:

• Update frequency

• Message latency

• Missing updates

• Aircraft timeout detection

• Schema validation

---

# Operational Dashboard

Observation Lounge provides:

• Service health

• Fleet status

• Active incidents

• Performance metrics

• Activity timeline

• Operational history

---

# Future Monitoring

Planned monitoring enhancements include:

• Resource utilization

• Network latency

• Memory usage

• CPU usage

• Telemetry frequency graphs

• Fleet analytics

• Historical reporting

---

# Summary

Falcon monitoring provides continuous operational visibility across every deployed service, ensuring issues can be detected and investigated before they impact flight operations.