FROM node:20-alpine

# needed to compile better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p /data

ENV NODE_ENV=production
ENV DB_PATH=/data/db.sqlite

EXPOSE 3001
CMD ["node", "dist/index.js"]
