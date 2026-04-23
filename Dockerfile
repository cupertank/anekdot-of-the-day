FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN apk add --no-cache font-dejavu && npm ci --omit=dev
COPY server.js .
EXPOSE 3000
USER node
CMD ["node", "server.js"]
