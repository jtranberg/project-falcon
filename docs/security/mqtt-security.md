# MQTT Security

## Overview

MQTT is the messaging backbone of the Falcon platform.

Protecting MQTT communications is essential to maintaining aircraft integrity, operational reliability, and platform security.

---

# Security Objectives

Falcon secures MQTT communications through:

• Encrypted transport

• Broker authentication

• Controlled topic access

• Credential management

• Connection monitoring

---

# Broker

Current production deployments use:

HiveMQ Cloud

All communication occurs over encrypted TLS connections.

---

# Authentication

MQTT clients authenticate using:

• Username

• Password

Credentials are stored as deployment environment variables.

Credentials must never be committed to source control.

---

# Encryption

All MQTT communication uses TLS.

Plaintext MQTT connections are not permitted in production.

---

# Topic Isolation

Clients should publish and subscribe only to authorized topics.

Example

falcon/drone/{droneId}/telemetry

falcon/drone/{droneId}/command

Future deployments may implement broker-side topic permissions.

---

# Client Identity

Each MQTT client should have a unique client identifier.

Duplicate client identifiers should be avoided to prevent unexpected disconnections.

---

# Credential Rotation

Credentials should be rotated periodically or immediately following suspected compromise.

Deployment secrets should be updated through the deployment platform.

---

# Monitoring

MQTT security monitoring includes:

• Connection attempts

• Authentication failures

• Unexpected disconnects

• Broker availability

• Publish failures

---

# Future Enhancements

Future improvements may include:

• Mutual TLS

• Client certificates

• Broker access control lists

• Certificate rotation

• Hardware-backed credentials

• Topic-level authorization

---

# Summary

MQTT security protects the communication channel between Falcon services, ensuring that telemetry and flight commands remain confidential, authenticated, and resistant to unauthorized access.