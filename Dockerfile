FROM oven/bun:alpine
WORKDIR /app
COPY package.json bun.lock jokes.json stirlitz.json ./
RUN apk add --no-cache font-dejavu vips
RUN bun install --frozen-lockfile --production
COPY server.js .
EXPOSE 3000
USER bun
CMD ["bun", "server.js"]
