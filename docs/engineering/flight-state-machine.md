# Flight State Machine

## Overview

The Falcon flight controller operates as a deterministic state machine.

Each aircraft exists in exactly one flight state at any point in time.

State transitions occur only after receiving valid commands or internal flight events.

This design simplifies command validation, improves reliability, and reduces unexpected aircraft behavior.

---

# Current States

STANDBY

Aircraft is powered and awaiting commands.

Allowed Commands

• START_MISSION

---

MISSION

Aircraft is actively executing a mission.

Allowed Commands

• HOVER

• LAND

• RETURN_TO_HOME

• PAUSE_MISSION

---

HOVER

Aircraft maintains its current position.

Allowed Commands

• RESUME_MISSION

• LAND

• RETURN_TO_HOME

---

LANDING

Aircraft is executing an autonomous landing.

Allowed Commands

None

Landing cannot be interrupted.

---

# State Diagram

          START_MISSION

STANDBY ---------------------> MISSION

                                 │

                     PAUSE/HOVER │

                                 ▼

                              HOVER

                                 │

                     RESUME_MISSION

                                 ▼

                              MISSION

                                 │

               LAND / RETURN_HOME

                                 ▼

                             LANDING

                                 │

                          Complete

                                 ▼

                             STANDBY

---

# Invalid Commands

Commands that are not valid for the current state are rejected.

Example

LAND while already LANDING

Result

REJECTED

---

# Future States

ARMING

TAKEOFF

RETURN_TO_HOME

EMERGENCY

FAILSAFE

SHUTDOWN

CALIBRATION

MISSION_COMPLETE

---

# Design Principles

The Falcon state machine is:

• Deterministic

• Predictable

• Easy to test

• Extensible

• Safe

---

# Summary

The flight state machine governs all aircraft behavior and ensures that commands are executed only when operationally valid.