# Production image of the Customer Dashboard, in two stages: the first one installs the
# dependencies and builds the app, the second one keeps only the build output on top of Node.
# PUBLIC_API_URL is not a build argument: the adapter-node server reads it when it starts.

# ---- build ----
FROM node:22-slim AS build

WORKDIR /app

# Dependencies first, copied from the manifests alone: the layer only changes when they do.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime ----
FROM node:22-slim

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY --from=build /app/build ./build
# Only the production dependencies, if the app ever declares any (today it declares none).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

USER node

EXPOSE 3000

CMD ["node", "build"]
