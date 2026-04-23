FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json jokes.json stirlitz.json ./
RUN apk add --no-cache font-dejavu vips-dev
RUN npm ci --omit=dev
COPY server.js .
EXPOSE 3000
USER node
CMD ["node", "server.js"]
