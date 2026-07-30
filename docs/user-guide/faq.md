# Frequently Asked Questions

## What is Falcon?

Falcon is a cloud-native autonomous systems platform for controlling, monitoring, and observing aircraft through secure distributed services.

---

## What does the Falcon Gateway do?

The Falcon Gateway connects browser clients to aircraft using Socket.IO and MQTT.

---

## What is MQTT?

MQTT is the messaging protocol used to exchange commands and telemetry between Falcon services.

---

## Why am I not seeing telemetry?

Verify:

• Drone Client is running

• MQTT is connected

• Gateway is online

• Drone Console is connected

---

## Why are commands not working?

Check:

• Aircraft connection

• Flight mode

• Gateway logs

• MQTT connectivity

• Command validation

---

## What happens if the aircraft disconnects?

The platform detects the disconnect, updates the aircraft status, and Observation Lounge may generate an operational incident.

---

## Is Falcon designed for multiple aircraft?

The architecture supports future fleet expansion.

Current releases focus primarily on single-aircraft operation.

---

## Where are configuration settings stored?

Configuration is managed through environment variables.

Sensitive credentials should never be stored in source code.

---

## How do I report a bug?

Include:

• Software version

• Steps to reproduce

• Expected behavior

• Actual behavior

• Relevant logs

---

## Where can I learn more?

Additional documentation is available in:

Architecture

Engineering

Operations

Security

Governance

API Reference

Deployment

---

# Summary

This FAQ addresses common questions about Falcon operation, architecture, and troubleshooting.