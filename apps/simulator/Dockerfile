FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/simulator/package.json apps/simulator/package.json
RUN npm install
COPY apps/simulator apps/simulator
RUN npm run build -w @falcon/simulator

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/simulator/dist ./apps/simulator/dist
COPY apps/simulator/package.json ./apps/simulator/package.json
CMD ["node", "apps/simulator/dist/index.js"]
