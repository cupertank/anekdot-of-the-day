FROM dhi.io/bun:1-alpine3.22-dev AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN apk add --no-cache font-dejavu
RUN bun install --frozen-lockfile --production
COPY server.js jokes.json stirlitz.json ./

FROM dhi.io/bun:1-alpine3.22
WORKDIR /app
COPY --from=builder /app .
COPY --from=builder /usr/share/fonts/dejavu /usr/share/fonts/dejavu
COPY --from=builder /etc/fonts /etc/fonts
USER nonroot
EXPOSE 3000
CMD ["/usr/local/bin/bun", "server.js"]
