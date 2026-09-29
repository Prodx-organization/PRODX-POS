FROM oven/bun:1.4.2

RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run server:check

EXPOSE 4000

CMD ["bun", "run", "server:start"]
