# Telemetry Schema

## Overview

The Falcon platform exchanges aircraft telemetry using a standardized JSON document.

The telemetry schema provides a consistent interface between the Native Drone Client, Falcon Gateway, Drone Console, Flight Simulator, Observation Lounge, and future platform services.

---

# Design Goals

The telemetry schema is designed to be:

• Human readable

• Versioned

• Extensible

• Backward compatible

• Lightweight

• Suitable for real-time streaming

---

# Telemetry Envelope

Every telemetry message contains a standard envelope.

```json
{
  "telemetry": {},
  "alerts": [],
  "gatewayReceivedAt": "",
  "latencyMs": 0
}
```

---

# Aircraft Telemetry

```json
{
  "schemaVersion": 1,
  "droneId": "falcon-05",
  "timestamp": "2026-07-29T18:45:22Z",
  "sequence": 1045,

  "position": {
    "latitude": 48.4284,
    "longitude": -123.3656,
    "altitudeM": 120.5
  },

  "motion": {
    "speedMps": 18.2,
    "headingDeg": 142
  },

  "power": {
    "batteryPercent": 87.4,
    "voltageV": 24.1
  },

  "health": {
    "temperatureC": 41.8,
    "signalDbm": -59,
    "gpsFix": true
  },

  "flightMode": "MISSION"
}
```

---

# Field Definitions

## schemaVersion

Type

Integer

Description

Telemetry schema version.

---

## droneId

Type

String

Description

Unique aircraft identifier.

Example

```
falcon-05
```

---

## timestamp

Type

ISO-8601 UTC

Description

Aircraft timestamp.

---

## sequence

Type

Integer

Description

Incrementing telemetry sequence number.

Used for:

• Lost packet detection

• Debugging

• Ordering

---

# Position

## latitude

Decimal degrees.

---

## longitude

Decimal degrees.

---

## altitudeM

Aircraft altitude above ground.

Unit

Meters

---

# Motion

## speedMps

Current aircraft speed.

Unit

Meters per second.

---

## headingDeg

Aircraft heading.

Range

0-359°

---

# Power

## batteryPercent

Remaining battery.

Range

0-100

---

## voltageV

Current battery voltage.

Unit

Volts

---

# Health

## temperatureC

Aircraft temperature.

Unit

Degrees Celsius.

---

## signalDbm

Wireless signal strength.

Unit

dBm

---

## gpsFix

Boolean

Indicates GPS lock.

---

# Flight Mode

Current values include:

• STANDBY

• MISSION

• HOVER

• LANDING

Additional modes may be added in future schema versions.

---

# Alerts

Optional alerts accompany telemetry.

Example

```json
[
  {
    "code": "LOW_BATTERY",
    "severity": "WARNING",
    "message": "Battery below 20%"
  }
]
```

---

# Gateway Metadata

## gatewayReceivedAt

Timestamp recorded by the Falcon Gateway.

---

## latencyMs

Approximate transport latency measured by the gateway.

---

# Versioning

The telemetry schema follows semantic evolution.

New fields may be added.

Existing fields will not change meaning within the same schema version.

Breaking changes require a new schemaVersion.

---

# Future Extensions

Planned additions include:

• Wind speed

• Wind direction

• Satellite count

• Mission progress

• Waypoint status

• Camera status

• Payload status

• CPU utilization

• Memory utilization

• Flight controller version

---

# Summary

The Falcon telemetry schema defines the standard data contract shared across every platform service.

Maintaining a stable schema ensures interoperability between aircraft, gateways, browser applications, simulators, and operational monitoring systems.