# SocialFlow AI Dashboard — Backend

## Environment Variable Setup

All configuration is validated at startup via **Zod** in `src/config/config.ts`.  
If any required variable is missing or has the wrong type the process exits immediately with a clear error listing every failing field.

### Quick start

```bash
cp .env.example .env
# Fill in the required values (see table below), then:
npm run dev
```

### Required variables

| Variable             | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string — `postgresql://USER:PASS@HOST:PORT/DB` |
| `JWT_SECRET`         | Secret used to sign access tokens (min 32 chars recommended)         |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens (min 32 chars recommended)        |
| `TWITTER_API_KEY`    | Twitter / X API key                                                  |
| `TWITTER_API_SECRET` | Twitter / X API secret                                               |

### Connection pool

Pool parameters are injected automatically into `DATABASE_URL` at startup based on `NODE_ENV`. Override with env vars if needed.

| `NODE_ENV`    | `connection_limit` | `pool_timeout` |
| ------------- | ------------------ | -------------- |
| `development` | 5                  | 10s            |
| `test`        | 2                  | 10s            |
| `production`  | 10                 | 20s            |

Override defaults:

```bash
DB_CONNECTION_LIMIT=20   # max open connections per Prisma process
DB_POOL_TIMEOUT=30       # seconds to wait for a free connection before erroring
```

**Sizing guidance:** `connection_limit` should be `(2 × CPU cores) + 1` per app instance, and must not exceed your Postgres `max_connections` divided by the number of running instances. For PgBouncer in transaction mode, keep it at `1`.

### Optional variables with defaults

| Variable                        | Default                             | Description                                                              |
| ------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| `NODE_ENV`                      | `development`                       | `development` \| `production` \| `test`                                  |
| `BACKEND_PORT`                  | `3001`                              | HTTP server port                                                         |
| `DB_CONNECTION_LIMIT`           | see pool table                      | Max open connections per Prisma process                                  |
| `DB_POOL_TIMEOUT`               | see pool table                      | Seconds to wait for a free connection                                    |
| `JWT_EXPIRES_IN`                | `15m`                               | Access token TTL                                                         |
| `JWT_REFRESH_EXPIRES_IN`        | `7d`                                | Refresh token TTL                                                        |
| `REDIS_HOST`                    | `127.0.0.1`                         | Redis host                                                               |
| `REDIS_PORT`                    | `6379`                              | Redis port                                                               |
| `REDIS_DB`                      | `0`                                 | Redis database index                                                     |
| `REDIS_PASSWORD`                | —                                   | Redis password (optional)                                                |
| `LOG_LEVEL`                     | `info`                              | `error` \| `warn` \| `info` \| `http` \| `verbose` \| `debug` \| `silly` |
| `OTEL_SERVICE_NAME`             | `socialflow-backend`                | OpenTelemetry service name                                               |
| `OTEL_EXPORTER`                 | `jaeger`                            | `jaeger` \| `honeycomb` \| `otlp`                                        |
| `JAEGER_ENDPOINT`               | `http://localhost:14268/api/traces` | Jaeger collector URL                                                     |
| `OTEL_EXPORTER_OTLP_ENDPOINT`   | `http://localhost:4318/v1/traces`   | OTLP endpoint                                                            |
| `OTEL_DEBUG`                    | `false`                             | Enable verbose OTel diagnostics                                          |
| `DATA_RETENTION_MODE`           | `archive`                           | `archive` \| `delete`                                                    |
| `DATA_PRUNING_CRON`             | `0 2 * * *`                         | Cron schedule for data pruning                                           |
| `DATA_RETENTION_LOG_DAYS`       | `30`                                | Log retention in days                                                    |
| `DATA_RETENTION_ANALYTICS_DAYS` | `90`                                | Analytics retention in days                                              |

### Social / third-party integrations (all optional)

| Variable                                      | Description                             |
| --------------------------------------------- | --------------------------------------- |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`     | Facebook Graph API credentials          |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | Google OAuth credentials for YouTube    |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`  | TikTok API credentials                  |
| `DEEPL_API_KEY`                               | DeepL translation API key               |
| `GOOGLE_TRANSLATE_API_KEY`                    | Google Translate API key                |
| `ELEVENLABS_API_KEY`                          | ElevenLabs TTS API key                  |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe billing credentials              |
| `SLACK_WEBHOOK_URL`                           | Slack webhook for health alerts         |
| `ELASTICSEARCH_URL`                           | Elasticsearch endpoint for log shipping |

### Validation error example

Starting the server with a missing `JWT_SECRET` produces:

```
Environment validation failed:
  • JWT_SECRET: Invalid input: expected string, received undefined
```

## Distributed Tracing (OpenTelemetry)

Tracing is initialised in `src/tracing.ts` (frontend/shared) and `backend/src/tracing.ts` (backend server). Both files **must be imported before any other module** so auto-instrumentation patches are applied at load time.

### Exporters

Select the exporter with `OTEL_EXPORTER`:

| Value              | Destination                                         | Required extra vars                      |
| ------------------ | --------------------------------------------------- | ---------------------------------------- |
| `jaeger` (default) | Jaeger HTTP collector                               | `JAEGER_ENDPOINT`                        |
| `honeycomb`        | Honeycomb OTLP endpoint                             | `HONEYCOMB_API_KEY`, `HONEYCOMB_DATASET` |
| `otlp`             | Any OTLP/HTTP backend (Grafana Tempo, Lightstep, …) | `OTEL_EXPORTER_OTLP_ENDPOINT`            |

### Span processor

The backend selects the processor based on `OTEL_DEBUG`:

| `OTEL_DEBUG`      | Processor             | Behaviour                                                                                           |
| ----------------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| `false` (default) | `BatchSpanProcessor`  | Buffers spans; exports every 5 s or when the queue (512) is full. Low overhead — use in production. |
| `true`            | `SimpleSpanProcessor` | Exports each span synchronously as it ends. High overhead — use only for local debugging.           |

The frontend/shared `src/tracing.ts` always uses `BatchSpanProcessor`.

### Debug flag

```bash
OTEL_DEBUG=true   # enables DiagConsoleLogger at DEBUG level + SimpleSpanProcessor (backend)
```

With `OTEL_DEBUG=true` every span export attempt, SDK lifecycle event, and internal OTel error is printed to stdout. Disable in production — it is verbose and adds per-span I/O latency.

### Recommended production defaults

```bash
OTEL_EXPORTER=otlp                              # or honeycomb
OTEL_EXPORTER_OTLP_ENDPOINT=http://<collector>:4318/v1/traces
OTEL_SERVICE_NAME=socialflow-backend
OTEL_DEBUG=false
NODE_ENV=production
```

### Shutdown lifecycle

On `SIGTERM` or `SIGINT` the server runs a **graceful shutdown sequence** (30 s hard timeout):

1. HTTP server stops accepting new connections.
2. BullMQ workers, webhook workers, scheduled jobs, and the queue manager are closed.
3. Prisma disconnects from the database.
4. The OTel SDK calls `sdk.shutdown()`, which flushes all buffered spans to the exporter before the process exits.

If `sdk.shutdown()` is skipped (e.g. `process.exit()` called directly) any spans still in the `BatchSpanProcessor` queue are lost. Always let the signal handlers complete.

The backend's `SIGTERM` handler in `tracing.ts` is intentionally separate from the main shutdown sequence so the OTel flush happens even if the application-level shutdown throws.

### Troubleshooting missing traces

- **No spans in Jaeger / collector** — confirm the collector is reachable: `curl -v $JAEGER_ENDPOINT`. Check for `ECONNREFUSED` in logs.
- **Spans appear after a delay** — expected with `BatchSpanProcessor` (up to 5 s). Set `OTEL_DEBUG=true` temporarily to see spans immediately.
- **`HONEYCOMB_API_KEY is not set` warning** — set the key or switch `OTEL_EXPORTER` to `jaeger`/`otlp`.
- **Spans missing on crash / `kill -9`** — `SIGKILL` bypasses signal handlers; buffered spans are dropped. Use `SIGTERM` for container stops (`terminationGracePeriodSeconds` in Kubernetes).
- **Auto-instrumentation not capturing a library** — ensure `import './tracing'` is the very first line of the entry point, before any other imports.
- **`OTEL_DEBUG=true` but no output** — the logger is set on the global `diag` singleton; verify no other module calls `diag.setLogger` after tracing initialises.

---

## Database Backup Runbook

The backup script is at `scripts/db-backup.ts`. It dumps the database with `pg_dump`, uploads the file to S3, then prunes objects older than 30 days.

### Prerequisites

**Tooling** — `pg_dump` must be on `PATH` and match the server's major Postgres version:

```bash
pg_dump --version   # e.g. pg_dump (PostgreSQL) 16.x
```

**Environment variables:**

| Variable           | Required | Default     | Description                       |
| ------------------ | -------- | ----------- | --------------------------------- |
| `DATABASE_URL`     | yes      | —           | PostgreSQL connection string      |
| `S3_BACKUP_BUCKET` | yes      | —           | S3 bucket name for backup storage |
| `AWS_REGION`       | no       | `us-east-1` | AWS region of the bucket          |

AWS credentials are resolved by the SDK in the standard order: env vars (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`), `~/.aws/credentials`, or an attached IAM role (recommended in production).

**IAM permissions** — the identity running the script needs:

```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:ListBucket", "s3:DeleteObject"],
  "Resource": ["arn:aws:s3:::YOUR_BUCKET", "arn:aws:s3:::YOUR_BUCKET/backups/*"]
}
```

### Running a backup

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db" \
S3_BACKUP_BUCKET="my-backups" \
npx ts-node scripts/db-backup.ts
```

Expected output:

```
Starting database backup...
Uploading to S3...
Backup uploaded: s3://my-backups/backups/db-backup-2026-03-28.sql
Backup complete
```

### Validation and integrity check

After the script exits, confirm the object exists and is non-zero:

```bash
aws s3 ls s3://$S3_BACKUP_BUCKET/backups/ --human-readable | sort | tail -5
```

Verify the dump is a valid PostgreSQL archive:

```bash
aws s3 cp s3://$S3_BACKUP_BUCKET/backups/db-backup-$(date +%F).sql /tmp/verify.sql
head -3 /tmp/verify.sql   # first line should start with "--"
pg_restore --list /tmp/verify.sql > /dev/null && echo "OK"
```

### Restore simulation procedure

Run this against a throwaway database — never against production:

```bash
# 1. Download the target backup
aws s3 cp s3://$S3_BACKUP_BUCKET/backups/db-backup-<DATE>.sql /tmp/restore.sql

# 2. Create an isolated restore target
createdb restore_test

# 3. Restore
psql restore_test < /tmp/restore.sql

# 4. Spot-check row counts against production
psql restore_test -c "\dt"
psql restore_test -c "SELECT COUNT(*) FROM users;"

# 5. Drop the test database when done
dropdb restore_test
```

A successful restore with matching row counts confirms the backup is usable.

---

## Analytics Integration Status

Current platform-by-capability implementation status for analytics integrations is tracked in:

- `backend/docs/analytics-integration-status.md`

Use that matrix as the source of truth for whether each platform capability is **implemented**, **partial**, or **planned**, including owner paths and roadmap links.

---

## Data Retention and Pruning Policy

Retention is enforced by the backend data pruning service and scheduler.

- **Targets:** log files and analytics files.
- **Default windows:** logs = `30` days, analytics = `90` days.
- **Default paths:** `logs` and `data/analytics` (override via `DATA_RETENTION_LOG_PATHS`, `DATA_RETENTION_ANALYTICS_PATHS`).
- **Modes:**
  - `archive` (default): moves eligible files into `DATA_RETENTION_ARCHIVE_DIR` under category folders.
  - `delete`: permanently removes eligible files.

Safe validation should start with `DATA_RETENTION_MODE=archive` and `DATA_PRUNING_ENABLED=false`, then run a manual pruning cycle against sandbox path targets before enabling schedule-based runs.

Full end-to-end runbook (targets, defaults, operational expectations, dry-run workflow, rollback/recovery):

- `backend/docs/retention-pruning-policy.md`

---

## Running tests

```bash
# All tests
npm test

# Config service only (with coverage)
npx jest --testPathPatterns="config/__tests__/config.test.ts" --coverage --collectCoverageFrom="src/config/config.ts"
```

The config service maintains **100% statement, branch, function, and line coverage**.
