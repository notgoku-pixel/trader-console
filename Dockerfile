FROM node:20-slim

# The skills are pure Python standard-library scripts, so only Python itself is needed.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production \
    PORT=8787 \
    SKILLS_DIR=/app/skills \
    TRADER_DATA_DIR=/app/trader \
    PYTHONUNBUFFERED=1

EXPOSE 8787

CMD ["node", "server/index.js"]
