# Use a Debian-based image with Deno
FROM denoland/deno:latest

# Install necessary tools and libraries
RUN apt-get update && apt-get install -y \
    texlive-full \
    gcc \
    g++ \
    bash \
    cron \
    && apt-get clean

# Set the working directory
WORKDIR /app

# Copy the backend files into the container
COPY . /app

# Copy the cron schedule and set its permissions
COPY exam-cleanup-cron /etc/cron.d/exam-cleanup-cron
RUN chmod 0644 /etc/cron.d/exam-cleanup-cron

# Expose the server port
EXPOSE 3000

# Set environment variables
ENV MONGODB_URI=mongodb://mongo:27017/examToolboxDB

# Run the server.ts script using Deno and start CRON
CMD sh -c "service cron start && deno run --allow-net --allow-env --allow-write --allow-read --allow-run --allow-import --allow-sys server.ts"
