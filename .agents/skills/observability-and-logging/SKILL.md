---
name: observability-and-logging
description: Use when adding backend services/controllers, touching error handling or Actuator, adding mobile or dashboard error reporting, or when the user asks about monitoring, logging, crash reports, or debugging production issues.
---

## Why this exists

Nothing is built yet. With one backend container on a shared VPS, the first debugging tool will be `docker logs`. Build in the cheap basics from phase 1 so that is enough, and add more only when it is needed.

## Cheap-first order

1. **Correlation ID filter + MDC** (phase 1): a servlet filter that reads or generates `X-Request-Id`, puts it in MDC, returns it on the response, and clears it after the request. Makes `docker logs` greppable per request. The dashboard and mobile app may send their own `X-Request-Id` so a client error can be matched to a log line.
2. **Structured (JSON) console logs**: Spring Boot's built-in structured logging (`logging.structured.format.console=ecs` or `logstash`), set once for the whole project.
3. **Actuator with only `/actuator/health` public** (phase 1): used by the Compose healthcheck and the post-deploy check ([[docker-vps-deployment]]).
4. **Log rotation** on every Compose service, so logs can't fill the shared VPS disk.
5. **Mobile crash reporting** (later, only if the user adds it): Sentry for Expo (`@sentry/react-native` with the Expo config plugin) is the likely choice, most useful once the app is in the stores and crashes happen on phones we never see. Its DSN is public by design, but scrub emails, tokens, and personal notes before sending. Same idea for the dashboard. Don't add it unasked.
6. **Full stack** (Prometheus/Grafana, Loki, OpenTelemetry): only with more than one host or service, or if the user asks.

## Rules

* Actuator: expose `health` only (`management.endpoints.web.exposure.include=health`). Keep `info` safe if added. Never expose `env`, `configprops`, `heapdump`, or `metrics` publicly; disable them or require ADMIN.
* Never log: passwords, password hashes, JWTs, `JWT_SECRET` or other secrets, login codes, full visitor emails, personal note text, or request bodies of auth and `/api/me/*` endpoints. Log ids (admin id, visitor id, note id, request id) instead. Overlaps with [[data-privacy-and-audit]].
* Use SLF4J (comes with Spring Boot); follow the existing logging pattern in `service/impl` once there is one. No new logging library.
* 5xx paths log at `ERROR` once, in `GlobalExceptionHandler`, with the operation, ids, and request id, and return a generic message to the client. Don't log the same exception at every layer.
* Expected client errors (validation 400, 401, 403, 404, 429) log at `INFO`/`WARN` without a stack trace.
* Log the events worth knowing about at `INFO`: admin login success/failure (admin id or masked email), note published/unpublished, content validation rejected (note id, reason), visitor code requested/verified (visitor id or masked email), account deleted (visitor id), rate limit tripped (endpoint, key type, not the key).
* Mobile and dashboard: no `console.log` of tokens, emails, or note text in release builds.
* Recommend a log aggregator only when the user asks about scaling past one VPS.

## Checklist

1. Could any new log line contain personal data, a code, or a secret? Redact it.
2. Is the request ID in MDC for the whole request?
3. Are error logs actionable (ids + request id), and logged once?
4. If Actuator is touched, is `/actuator/health` still the only public endpoint?
5. If crash reporting is added to mobile or dashboard, is personal data scrubbed before sending?
