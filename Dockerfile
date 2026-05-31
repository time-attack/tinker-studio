FROM node:22-slim

# Install system tools needed for IPA binary analysis
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      unzip \
      binutils \
      file && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 8080
ENV NODE_ENV=production
CMD ["npm", "start"]
