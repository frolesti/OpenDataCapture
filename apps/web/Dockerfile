FROM node:lts AS base
ARG RELEASE_VERSION
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN corepack enable
RUN pnpm install -g turbo@latest

# PRUNE WORKSPACE
# Note: Here we cannot use --docker, as is recommended, since the generated
# json directory does not allow linking package.json executable files
FROM base AS builder
COPY . .
RUN turbo prune @opendatacapture/web

# INSTALL DEPENDENCIES AND BUILD
FROM base AS installer
ARG VERSION=latest
ENV VERSION=$VERSION
COPY tsconfig.base.json vitest.config.ts vitest.workspace.ts ./
COPY --from=builder /app/out/ .
RUN pnpm install --frozen-lockfile 
RUN turbo build --filter=@opendatacapture/web

# RUN SERVER
FROM base AS runner
RUN pnpm install -g @import-meta-env/cli@0.6.8 http-server@14.1.1
COPY --from=installer /app/apps/web/.env.public /app/apps/web/dist/ ./
# Set default environment variables if not provided
ENV CONTACT_EMAIL=${CONTACT_EMAIL:-frolesti4@gmail.com}
ENV LICENSE_URL=${LICENSE_URL:-https://github.com/DouglasNeuroInformatics/OpenDataCapture/blob/main/LICENSE}
ENV PLAUSIBLE_BASE_URL=${PLAUSIBLE_BASE_URL:-https://plausible.io}
ENV PLAUSIBLE_WEB_DATA_DOMAIN=${PLAUSIBLE_WEB_DATA_DOMAIN:-opendatacapture.org}
ENV API_BASE_URL=${API_BASE_URL:-https://api-3bj5.onrender.com}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL:-https://api-3bj5.onrender.com}
ENV GATEWAY_ENABLED=${GATEWAY_ENABLED:-true}

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f $API_BASE_URL/v1/health || exit 1

CMD [ "sh", "-c", "import-meta-env -x .env.public -p index.html && http-server -s -p 80 -P http://localhost:80? --gzip ." ]
