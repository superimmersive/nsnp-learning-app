FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 8787
CMD ["sh", "-c", "node --experimental-strip-types src/migrate.ts && node --experimental-strip-types src/seed.ts && node --experimental-strip-types src/index.ts"]
