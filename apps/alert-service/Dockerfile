FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/alert-service/package.json apps/alert-service/package.json
RUN npm install
COPY packages/proto packages/proto
COPY apps/alert-service apps/alert-service
RUN npm run build -w @falcon/alert-service

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/alert-service/dist ./apps/alert-service/dist
COPY --from=build /app/packages/proto ./packages/proto
COPY apps/alert-service/package.json ./apps/alert-service/package.json
CMD ["node", "apps/alert-service/dist/index.js"]
