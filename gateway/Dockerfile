FROM rust:latest AS builder

# Create a new directory for the application
WORKDIR /app

# Copy the source code into the container
COPY . .


# Build the application
RUN cargo build --release -p networking

# Use a minimal base image for runtime
FROM ubuntu:latest

# Copy the compiled binary from the builder image
COPY --from=builder /app/target/release/networking .

EXPOSE 8080

# Command to run the binary
CMD ["./networking"]