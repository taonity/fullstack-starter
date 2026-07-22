---
applyTo: "**"
---

# Coding conventions

## Configuration properties
- Never hardcode configurable values (URLs, hosts, ports, timeouts, credentials, feature flags, names, thresholds, etc.) directly in code.
- Put the value only in the appropriate property file (`application*.yaml`) and read it through Spring configuration (`@ConfigurationProperties` classes such as `AppProperties`, or `${...}` placeholders in config).
- When you add a new application property, add it to the relevant `application*.yaml` file. It will be printed automatically at startup by `ActivePropertiesLogging` (local profile) — no per-property logging code is needed.

## Comments
- Keep only comments that resolve genuine ambiguity (non-obvious intent, tricky edge cases, why-not-what).
- Do not add comments that restate what the code already expresses. Prefer clear names over explanatory comments.
