# Use the official Node.js image
FROM node:24

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN --mount=type=cache,target=/root/.npm npm install

# Copy the rest of the application files
COPY --parents ["*.json", "src/", "./"]

EXPOSE 4200

# Start the frontend in development mode
CMD ["npm", "start", "--", "--configuration", "devcontainer", "--host=0.0.0.0"]
