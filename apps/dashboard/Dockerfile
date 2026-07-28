FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/dashboard/package.json apps/dashboard/package.json
RUN npm install
COPY apps/dashboard apps/dashboard
ARG VITE_GATEWAY_URL=http://localhost:5050
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
RUN npm run build -w @falcon/dashboard

FROM nginx:1.27-alpine
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html
EXPOSE 80
