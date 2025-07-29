FROM node:lts AS base
WORKDIR /app
ARG RELEASE_VERSION
ENV GATEWAY_DATABASE_URL="file:/dev/null"
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN corepack enable
RUN pnpm install -g turbo@latest

# PRUNE WORKSPACE
# Note: Here we cannot use --docker, as is recommended, since the generated
# json directory does not allow linking package.json executable files
FROM base AS pruner
COPY . .
RUN turbo prune @opendatacapture/api

# INSTALL DEPENDENCIES AND BUILD
FROM base AS installer
ARG VERSION=latest
ENV VERSION=$VERSION
COPY tsconfig.base.json vitest.config.ts vitest.workspace.ts ./
COPY --from=pruner /app/out/ .
RUN pnpm install --frozen-lockfile 
RUN turbo db:generate build --filter=@opendatacapture/api

# RUN SERVER
FROM base AS runner
COPY --from=installer /app/apps/api/dist/ /app/dist/
COPY --from=installer /app/apps/api/public/ /app/public/
COPY --from=installer /app/apps/api/dist/runtime/ /runtime/
# Include Prisma schema and generate client
COPY --from=installer /app/apps/api/prisma/ /app/prisma/

# Add a health check to verify the service is running
RUN apt-get update && apt-get install -y curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:10000/v1/health || exit 1

RUN echo '{ "type": "module", "imports": { "#runtime/v1/*": "./dist/runtime/v1/*" } }' > package.json
RUN echo '{ "type": "module" }' > /runtime/package.json
USER node
CMD [ "node", "--enable-source-maps", "./dist/app.js" ]
