FROM node:20-alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies)
RUN npm ci

# Copy all source files
COPY *.ts ./
COPY controllers ./controllers
COPY lib ./lib
COPY models ./models
COPY routes ./routes
COPY schemas ./schemas
COPY types ./types
COPY JDK_JSON_Genelator ./JDK_JSON_Genelator
COPY Server_JSON_Genelator ./Server_JSON_Genelator

# Create necessary directories
RUN mkdir -p /app/resources /app/data

# Change ownership to node user (uid:gid 1000:1000 in Alpine)
RUN chown -R node:node /app

# Use non-root user
USER node

# Expose port
EXPOSE 3000

# Start in development mode
CMD ["npm", "run", "dev"]
