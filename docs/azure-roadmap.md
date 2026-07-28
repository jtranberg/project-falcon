# Azure Integration Roadmap

## Stage 1: Container deployment

Deploy the dashboard, gateway, simulator, and alert service to Azure Container Apps.
Use Azure Container Registry for images and Log Analytics for centralized logs.

## Stage 2: Replace local broker

Replace Mosquitto with Azure IoT Hub device-to-cloud telemetry. Keep the gateway's normalized
telemetry contract so the dashboard and alert service do not need to change.

## Stage 3: Stream routing

Route IoT Hub telemetry to Event Hubs or another consumer endpoint. Add independent consumers
for persistence, alerts, analytics, and replay.

## Stage 4: Device management

Add Device Provisioning Service, per-device identity, device twins, desired properties, and
cloud-to-device commands.

## Stage 5: Observability and security

Add Application Insights, Azure Monitor alerts, managed identities, Key Vault secrets, TLS,
rate limits, dead-letter handling, and audit logs.
