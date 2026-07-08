FROM denoland/deno:latest

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.deno deno install

# Copy the rest of the application files
COPY --parents ["*.json", "src/", "./"]

EXPOSE 4200

# Start the frontend in development mode
CMD ["deno", "run", "--allow-net", "ng", "serve", "--configuration", "devcontainer", "--host", "0.0.0.0"]
