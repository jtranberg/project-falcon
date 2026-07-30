# Versioning

## Overview

Falcon follows Semantic Versioning (SemVer) for software releases.

Version numbers communicate the scope and compatibility of changes.

Format:

MAJOR.MINOR.PATCH

Example

1.4.2

---

# Major Version

Increment when introducing breaking changes.

Examples

• API redesign

• Incompatible protocol changes

• Major architecture changes

---

# Minor Version

Increment when adding backward-compatible functionality.

Examples

• New features

• Additional APIs

• New telemetry fields

• Performance improvements

---

# Patch Version

Increment for backward-compatible fixes.

Examples

• Bug fixes

• Documentation corrections

• Minor performance improvements

• Security patches

---

# Documentation Versioning

Documentation evolves alongside software releases.

Major documentation revisions should accompany major platform changes.

---

# API Versioning

APIs should remain backward compatible whenever practical.

Breaking API changes require a new major version.

---

# Schema Versioning

Telemetry and message schemas include an explicit schemaVersion field.

Breaking schema changes require a new schema version.

---

# Release Tags

Production releases should be tagged in source control.

Examples

v1.0.0

v1.1.0

v1.2.3

---

# Pre-release Versions

Pre-release identifiers may be used during development.

Examples

v2.0.0-alpha

v2.0.0-beta

v2.0.0-rc1

---

# Summary

A consistent versioning strategy provides predictable releases, clear compatibility expectations, and a stable foundation for long-term platform evolution.