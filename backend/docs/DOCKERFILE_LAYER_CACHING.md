# Optimizing Dockerfile Layer Caching

Docker builds images layer by layer. Each instruction (`RUN`, `COPY`, `ADD`) creates a new layer. If a layer hasn't changed, Docker reuses the cached version — skipping the rebuild entirely. Poor ordering kills this benefit.

---

## The Core Rule

**Copy what changes least, first. Copy what changes most, last.**

Dependencies change less often than source code. Always install deps before copying your app code.

---

## Before vs After

### Before (no caching optimization)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copies everything — any file change busts ALL layers below
COPY . .

RUN npm install
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Every time you change a single `.ts` file, Docker re-runs `npm install` from scratch.

---

### After (cache-optimized)

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# 1. Copy only dependency manifests first
COPY package.json package-lock.json ./

# 2. Install deps — this layer is cached until package*.json changes
RUN npm ci --omit=dev

# 3. Now copy source code
COPY . .

# 4. Build — only re-runs when source changes
RUN npm run build

# --- Production image ---
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Now `npm ci` is only re-run when `package.json` or `package-lock.json` changes.

---

## Key Techniques

### 1. Separate dependency install from source copy

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
```

### 2. Use `npm ci` over `npm install`

`npm ci` is deterministic and faster in CI/Docker — it installs exactly what's in `package-lock.json`.

### 3. Use multi-stage builds

Keeps the final image lean by discarding build tools and dev dependencies.

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### 4. Use a `.dockerignore` file

Prevents unnecessary files from invalidating the `COPY . .` layer.

```
node_modules
dist
.git
*.log
.env
coverage
```

### 5. Order ENV and ARG declarations carefully

`ARG` and `ENV` instructions also bust cache. Put them as late as possible, or group them before the step that needs them.

```dockerfile
# Bad — busts cache for everything below
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci

# Good
COPY package*.json ./
RUN npm ci
ENV NODE_ENV=production
```

### 6. Pin your base image

Floating tags like `node:20-alpine` can change upstream and bust your cache unexpectedly.

```dockerfile
# Prefer a digest-pinned or minor-version-pinned tag
FROM node:20.12-alpine
```

---

## Layer Cache Cheat Sheet

| What changed | Layers invalidated |
|---|---|
| Source `.ts` file | Only `COPY . .` and after |
| `package.json` | `COPY package*.json`, `npm ci`, and after |
| Base image update | Everything |
| `.env` file (if not in `.dockerignore`) | `COPY . .` and after |

---

## Prisma-specific tip

If you use Prisma, generate the client after installing deps but before copying all source:

```dockerfile
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build
```

This caches the Prisma client generation unless `prisma/schema.prisma` changes.
