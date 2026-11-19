FROM node:24.16.0 AS build

WORKDIR /app

COPY package*.json .

RUN npm ci

COPY . .

RUN npm run build

FROM nginx:1.31.8-alpine

COPY --from=build /app/build /usr/share/nginx/html/

COPY nginx.conf /etc/nginx/conf.d/default.conf