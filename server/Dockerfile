# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm i --only=production

COPY src ./src
COPY .env.example ./.env.example

ENV NODE_ENV=production
# Railway provee PORT
EXPOSE 8080

CMD ["node", "src/index.js"]