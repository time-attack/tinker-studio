FROM node:22-bookworm-slim

# ca-certificates: required for HTTPS to api.anthropic.com (slim lacks them)
# unzip + binutils: IPA extraction and nm/strings for binary analysis
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates \
      openssl \
      unzip \
      binutils \
      file && \
    update-ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 8080
ENV NODE_ENV=production
CMD ["npm", "start"]
