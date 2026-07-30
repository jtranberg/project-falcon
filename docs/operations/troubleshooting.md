# Troubleshooting Guide

## Overview

This guide provides solutions to common operational issues encountered while developing, deploying, and operating the Falcon platform.

When diagnosing an issue, always begin by identifying which service is affected before investigating downstream components.

---

# Troubleshooting Workflow

Follow this sequence when investigating problems:

1. Verify the affected service.
2. Check service health endpoints.
3. Review application logs.
4. Verify network connectivity.
5. Confirm environment variables.
6. Restart affected services if necessary.
7. Verify normal operation.

---

# Drone Console Cannot Connect

## Symptoms

• Connection status remains "Disconnected"

• Unable to issue commands

• No telemetry displayed

## Possible Causes

• Falcon Gateway is offline

• Incorrect gateway URL

• Network connectivity issues

• CORS configuration

## Resolution

Verify:

• Falcon Gateway is running

• VITE_GATEWAY_URL is correct

• Browser developer console for errors

• Gateway logs for incoming connections

---

# Telemetry Not Updating

## Symptoms

• Aircraft appears connected

• Telemetry values remain unchanged

## Possible Causes

• Drone Client stopped publishing

• MQTT broker disconnected

• Gateway subscription failure

• Socket.IO forwarding failure

## Resolution

Check:

• Drone Client logs

• MQTT connection status

• Gateway telemetry logs

• Browser network activity

---

# Commands Not Executing

## Symptoms

• Button click has no effect

• Aircraft does not respond

## Possible Causes

• Invalid command

• Aircraft offline

• MQTT publish failure

• Command validation failure

## Resolution

Verify:

• Aircraft is connected

• Gateway received the command

• MQTT publish succeeded

• Drone Client acknowledged the command

---

# MQTT Connection Failure

## Symptoms

• Drone Client repeatedly reconnects

• Gateway cannot publish commands

• Telemetry unavailable

## Possible Causes

• Incorrect credentials

• HiveMQ unavailable

• Firewall restrictions

• Network interruption

## Resolution

Verify:

• MQTT username

• MQTT password

• Broker URL

• TLS configuration

• Internet connectivity

---

# Flight Simulator Not Responding

## Symptoms

• Commands accepted

• No simulated aircraft movement

## Possible Causes

• Simulator process stopped

• Communication failure

• Invalid simulation state

## Resolution

Restart the simulator and verify:

• Service startup

• Connection to MQTT

• Simulation logs

---

# Observation Lounge Reports Offline

## Symptoms

• Service appears offline

• Incident created

## Possible Causes

• Health endpoint unavailable

• Service deployment failure

• Network timeout

## Resolution

Verify:

• /api/health endpoint

• Deployment status

• Application logs

• Network access

---

# High Telemetry Latency

## Symptoms

• Delayed position updates

• Sluggish dashboard

## Possible Causes

• Network congestion

• Broker latency

• Gateway overload

• Browser performance

## Resolution

Check:

• Gateway response times

• MQTT latency

• Browser performance tools

• Observation Lounge metrics

---

# Build Failures

## Symptoms

• Build does not complete

• Compilation errors

## Possible Causes

• Missing dependencies

• Invalid environment variables

• TypeScript errors

• Linting failures

## Resolution

Run:

```bash
npm install
npm run lint
npm run build
```

Review the first reported error before addressing subsequent errors.

---

# Deployment Issues

## Symptoms

• Deployment fails

• Service unavailable after deployment

## Possible Causes

• Missing environment variables

• Incorrect build configuration

• Invalid deployment settings

## Resolution

Verify:

• Environment variables

• Build logs

• Deployment configuration

• Health endpoint after deployment

---

# Common Environment Variables

Verify the following variables are configured correctly:

Gateway

• MQTT credentials

• Broker URL

• Server port

Drone Console

• VITE_GATEWAY_URL

Drone Client

• MQTT broker

• Client identifier

• Drone identifier

---

# Diagnostic Checklist

Before reporting an issue, collect:

• Component name

• Software version

• Error message

• Timestamp

• Relevant logs

• Steps to reproduce

• Screenshots if applicable

---

# Escalation

If the issue cannot be resolved:

1. Gather diagnostic information.
2. Review recent code changes.
3. Compare with previous working deployments.
4. Document findings.
5. Create an incident for further investigation.

---

# Summary

Most Falcon issues can be resolved by identifying the affected component, verifying connectivity, reviewing logs, and confirming configuration. A systematic troubleshooting process reduces downtime and simplifies incident resolution.