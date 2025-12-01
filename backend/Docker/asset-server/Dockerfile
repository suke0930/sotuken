FROM node:20-alpine
RUN apk add git --no-cache
WORKDIR /app
RUN git clone https://github.com/suke0930/sotuken.git
WORKDIR /app/sotuken
RUN git checkout origin/Server-Propites-Setup
WORKDIR /app/sotuken/backend/Asset
RUN npm i
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app/sotuken
USER nodejs
EXPOSE 3000
CMD ["npm", "run","dev"]
