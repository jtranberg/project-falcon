# Health Checks

## Overview

Every Falcon service exposes a health endpoint used by automated monitoring systems and the Observation Lounge.

Health checks provide a lightweight mechanism for determining service availability and operational readiness.

---

# Objectives

Health checks verify:

• Service availability

• Application startup

• Dependency status

• Database connectivity (where applicable)

• Messaging connectivity

• Version information

---

# Standard Endpoint

GET

/api/health

---

# Example Response

```json
{
  "success": true,
  "service": "falcon-gateway",
  "status": "healthy",
  "version": "1.0.0",
  "uptimeSeconds": 82341,
  "timestamp": "2026-07-29T18:42:17Z"
}
```

---

# Health States

Healthy

The service is fully operational.

---

Degraded

The service is operational but one or more dependencies are unavailable or performing poorly.

---

Offline

The service cannot be reached or has failed its health check.

---

# Health Evaluation

Observation Lounge periodically requests each registered application's health endpoint.

The resulting status determines:

• Dashboard health

• Incident generation

• Notifications

• Historical availability

---

# Current Services

Drone Console

Gateway

Drone Client

Flight Simulator

Observation Lounge

Each service is monitored independently.

---

# Future Enhancements

Future health reporting may include:

• Dependency graphs

• Startup diagnostics

• Version compatibility

• Resource usage

• Build information

• Git commit identifiers

---

# Summary

Health endpoints provide the foundation for operational monitoring and incident detection throughout the Falcon platform.