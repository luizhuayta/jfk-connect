# syntax=docker/dockerfile:1.7
# =============================================================================
# IJFK - Dockerfile multi-stage para Next.js 16 (standalone)
# =============================================================================
# Stage 1: deps       -> instala dependencias de producción
# Stage 2: builder    -> compila la aplicación con Turbopack
# Stage 3: runner     -> imagen final mínima (sólo lo necesario para correr)
# =============================================================================

# ---------- 1. Dependencias ---------------------------------------------------
FROM node:20.18.1-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiamos sólo los manifests para aprovechar la caché de capas de Docker
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ---------- 2. Build ---------------------------------------------------------
FROM node:20.18.1-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Reutilizamos node_modules de la etapa anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generamos un build id consistente entre builds
ARG NEXT_BUILD_ID=local
ENV NEXT_BUILD_ID=$NEXT_BUILD_ID

# NEXT_PUBLIC_* se inlinan en el bundle del cliente en build-time.
# Pasarlo como build arg para que el SDK de Sentry del navegador reciba el DSN.
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

# lib/session.ts lee JWT_SECRET a nivel de módulo (falla rápido si falta en
# producción). Con NODE_ENV=production ya seteado arriba, "next build" importa
# las rutas API durante "Collecting page data" y necesita este valor para no
# reventar el build. El valor real de runtime lo pone docker-compose vía
# environment:, este solo evita que el build falle.
ARG JWT_SECRET
ENV JWT_SECRET=$JWT_SECRET

# Build de Next.js (en v16 usa Turbopack por defecto)
RUN npm run build

# ---------- 3. Runner --------------------------------------------------------
FROM node:20.18.1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Creamos un usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copiamos los archivos necesarios para correr en modo standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Healthcheck opcional
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
