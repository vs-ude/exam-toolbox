# Use a Debian-based image with Deno
FROM denoland/deno:latest

# Install necessary tools and libraries
RUN apt-get update && apt-get install -y \
    texlive-full \
    gcc \
    g++ \
    bash \
    && apt-get clean

# Set the working directory
WORKDIR /app

# Copy the backend files into the container
COPY . /app

# Expose the server port
EXPOSE 3000

# Set environment variables
ENV MONGODB_URI=mongodb://mongo:27017/examToolboxDB

# Run the server.ts script using Deno
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-write", "--allow-read", "--allow-run", "server.ts"]
