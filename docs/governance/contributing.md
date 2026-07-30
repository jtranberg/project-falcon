# Contributing

## Overview

This document describes the development workflow for contributing to the Falcon platform.

The goal is to maintain high quality, stable releases while encouraging consistent engineering practices.

---

# Development Workflow

Typical workflow:

1. Create a feature branch.

2. Implement changes.

3. Test locally.

4. Update documentation.

5. Submit for review.

6. Merge after approval.

---

# Branch Naming

Examples

feature/telemetry-history

feature/dashboard-updates

bugfix/socket-reconnect

hotfix/mqtt-timeout

release/v1.2.0

---

# Commit Messages

Use clear, descriptive commit messages.

Examples

Add telemetry history support

Fix gateway reconnect logic

Improve command validation

Avoid vague messages such as:

Update

Fix stuff

Changes

---

# Pull Requests

Pull requests should include:

• Summary of changes

• Testing performed

• Documentation updates

• Screenshots when applicable

---

# Documentation

Documentation is considered part of the feature.

Architectural or behavioral changes should include corresponding documentation updates.

---

# Testing

Before merging:

• Project builds successfully

• Existing functionality remains operational

• New functionality has been verified

• Linting passes

---

# Code Quality

Contributors should follow:

• Coding Standards

• Security guidelines

• Architecture principles

• Documentation standards

---

# Questions

Questions regarding contributions should be discussed before implementing major architectural changes.

---

# Summary

Following a consistent contribution process helps maintain the quality and reliability of the Falcon platform.