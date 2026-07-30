# Flight Command Reference

## Overview

The Falcon platform supports browser-initiated commands that are routed through the Falcon Gateway and delivered to the aircraft over MQTT.

Each command generates a command acknowledgement indicating whether execution was accepted or rejected.

---

# Command Flow

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

Native Drone Client

↓

Command Status

↓

Gateway

↓

Browser

---

# START_MISSION

Description

Begins autonomous mission execution.

Parameters

None

Possible Responses

• ACCEPTED

• REJECTED

• FAILED

---

# PAUSE_MISSION

Description

Pauses the active mission while maintaining aircraft position.

Parameters

None

---

# RESUME_MISSION

Description

Resumes a paused mission.

Parameters

None

---

# HOVER

Description

Places the aircraft into a stable hover.

Parameters

None

---

# RETURN_TO_HOME

Description

Commands the aircraft to return to its launch position.

Parameters

None

---

# LAND

Description

Initiates an autonomous landing sequence.

Parameters

None

---

# SET_ALTITUDE

Description

Changes the aircraft target altitude.

Parameters

altitudeM

Type

Number

Example

120

---

# SET_HEADING

Description

Changes aircraft heading.

Parameters

headingDeg

Type

Number

Range

0-359

---

# Command Acknowledgements

Every command returns an acknowledgement.

Possible values include:

ACCEPTED

REJECTED

FAILED

Each acknowledgement may include an informational message describing the result.

---

# Future Commands

Future platform commands may include:

• SHUTDOWN

• ARM

• DISARM

• EMERGENCY_STOP

• HOLD_POSITION

• CAMERA_CONTROL

• PAYLOAD_RELEASE

• CALIBRATE

---

# Summary

Commands are validated by the Falcon Gateway before being delivered to the aircraft.

Execution status is reported back to the Drone Console through the command acknowledgement system.