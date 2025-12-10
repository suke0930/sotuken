FROM node:20-alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for tsx)
RUN npm ci

# Copy source files
COPY src ./src

# Create data directory
RUN mkdir -p /app/data && chown -R node:node /app/data

# Use non-root user
USER node

# Expose port
EXPOSE 3000

# Start in development mode with tsx
CMD ["npm", "run", "dev"]
