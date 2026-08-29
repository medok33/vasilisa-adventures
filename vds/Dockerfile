FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
WORKDIR /app
COPY . .
RUN chmod +x scripts/build-vds.sh && scripts/build-vds.sh

FROM node:22-bookworm-slim AS runtime
ARG APP_REVISION=unknown
ARG APP_SOURCE=https://github.com/medok33/vasilisa-adventures
LABEL org.opencontainers.image.revision=$APP_REVISION \
      org.opencontainers.image.source=$APP_SOURCE
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/data \
    TZ=Europe/Moscow
WORKDIR /app
RUN useradd --system --uid 10001 --create-home vasilisa && mkdir -p /data && chown -R vasilisa:vasilisa /data
COPY --from=builder --chown=vasilisa:vasilisa /app/.next/standalone ./
COPY --from=builder --chown=vasilisa:vasilisa /app/.next/static ./.next/static
COPY --from=builder --chown=vasilisa:vasilisa /app/public ./public
USER vasilisa
EXPOSE 3000
CMD ["node", "server.js"]
