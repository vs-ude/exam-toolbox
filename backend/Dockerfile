# Use the official Deno image
FROM denoland/deno:alpine

# Set the working directory
WORKDIR /app

# Copy the backend files into the container
COPY . /app

# Set environment variables (if needed)
ENV MONGODB_URI=mongodb://mongo:27017/examToolboxDB

# Run the server.ts script using Deno
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-write", "--allow-read", "--allow-run", "server.ts"]
