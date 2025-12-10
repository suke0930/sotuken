FROM alpine:latest

# Install necessary packages
RUN apk add --no-cache wget tar netcat-openbsd

# Set working directory
WORKDIR /app

# Download and extract FRP binary
# Using latest version v0.65.0
RUN wget -q https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_linux_amd64.tar.gz && \
    tar -xzf frp_0.65.0_linux_amd64.tar.gz && \
    mv frp_0.65.0_linux_amd64/frps /app/frps && \
    rm -rf frp_0.65.0_linux_amd64* && \
    chmod +x /app/frps

# Copy configuration file
COPY frps.toml /app/frps.toml

# Expose ports
EXPOSE 7000 7500

# Run FRP server
CMD ["/app/frps", "-c", "/app/frps.toml"]
