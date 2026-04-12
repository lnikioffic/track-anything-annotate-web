FROM rust:latest AS builder

# Create a new directory for the application
WORKDIR /app

# Copy the source code into the container
COPY . .


# Build the application
RUN cargo build --release -p networking

# Use a minimal base image for runtime
FROM ubuntu:latest

# Install CA certificates for HTTPS requests
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder image
COPY --from=builder /app/target/release/networking .

EXPOSE 8080

# Command to run the binary
CMD ["./networking"]
