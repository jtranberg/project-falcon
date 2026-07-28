FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/gateway/package.json apps/gateway/package.json
RUN npm install
COPY packages/proto packages/proto
COPY apps/gateway apps/gateway
RUN npm run build -w @falcon/gateway

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/gateway/dist ./apps/gateway/dist
COPY --from=build /app/packages/proto ./packages/proto
COPY apps/gateway/package.json ./apps/gateway/package.json
CMD ["node", "apps/gateway/dist/index.js"]
