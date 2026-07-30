# Command Lifecycle

## Overview

Every command follows the same lifecycle from operator input to aircraft execution.

This standardized flow improves reliability, observability, and troubleshooting.

---

# Lifecycle

Operator

↓

Drone Console

↓

Socket.IO

↓

Falcon Gateway

↓

Validation

↓

MQTT Publish

↓

Drone Client

↓

Command Execution

↓

Status Message

↓

Gateway

↓

Browser

---

# Stage 1

Operator Input

The operator selects a command.

Example

LAND

---

# Stage 2

Browser Validation

Basic client-side validation occurs.

Required fields

• droneId

• command

---

# Stage 3

Gateway Validation

The gateway verifies:

• command

• aircraft

• parameters

• MQTT availability

---

# Stage 4

MQTT Publish

Command is published to:

falcon/drone/{id}/command

---

# Stage 5

Aircraft Processing

The drone client validates:

• Current flight mode

• Command legality

• Safety constraints

---

# Stage 6

Execution

The aircraft performs the requested operation.

---

# Stage 7

Acknowledgement

A command status message is generated.

Possible values

ACCEPTED

FAILED

REJECTED

---

# Stage 8

Browser Update

The Drone Console displays the command result.

---

# Future Improvements

• Command queueing

• Priority commands

• Retry policies

• Cancellation

• Timeouts

• Audit history

---

# Summary

The standardized command lifecycle provides consistent behavior across all Falcon services.