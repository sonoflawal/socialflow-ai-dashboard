# API Versioning Policy

## Strategy

SocialFlow uses **URL-based versioning** (`/api/v1/`). The version is part of the path, making it explicit and easy to route at the infrastructure level (proxies, CDNs, API gateways).

## Current versions

| Version | Status     | Base URL    | Sunset date |
|---------|------------|-------------|-------------|
| v1      | **Stable** | `/api/v1`   | —           |

## Deprecation process

When a new version is introduced:

1. The old version is marked **deprecated** — it continues to work but responses include:
   ```
   Deprecation: true
   Link: </api/v2>; rel="successor-version"
   ```
2. A **minimum 6-month notice** is given before any version is sunset.
3. The sunset date is published in this document and in the `GET /api/vN` version metadata endpoint.
4. After sunset, the old prefix returns `410 Gone`.

## Backward compatibility within a version

Within a stable version (e.g. v1), we guarantee:

- No removal of existing fields from responses.
- No change to existing field types.
- No removal of existing endpoints.
- New optional fields and endpoints may be added at any time.

Breaking changes (field removal, type changes, endpoint removal) always require a new version.

## Version metadata endpoint

Every version exposes a metadata endpoint at its root:

```
GET /api/v1
```

```json
{
  "version": "v1",
  "status": "stable",
  "deprecated": false,
  "sunsetDate": null,
  "docs": "/api/v1/docs"
}
```

## Migration guide (legacy `/api` prefix)

The unversioned `/api` prefix is a **deprecated alias** for `/api/v1`. It will continue to work until v1 is sunset. To migrate, replace:

```
/api/<resource>  →  /api/v1/<resource>
```

No other changes are required — request/response shapes are identical.
