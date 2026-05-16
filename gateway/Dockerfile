FROM rust:1.95 AS builder

WORKDIR /app

# Copy workspace metadata first for better layer caching
COPY Cargo.lock Cargo.toml ./

# Copy workspace members
COPY networking ./networking
COPY storage-core ./storage-core
COPY yandex_disk ./yandex_disk

# Build the application and strip binary
RUN cargo build --release -p networking && \
    strip /app/target/release/networking

# Use a minimal base image for runtime
FROM debian:trixie-slim

# Install CA certificates
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates
# Copy the compiled binary from the builder image
COPY --from=builder /app/target/release/networking /app/networking

WORKDIR /app

EXPOSE 8080

# Non-root user for security (optional but recommended)
RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

CMD ["./networking"]
