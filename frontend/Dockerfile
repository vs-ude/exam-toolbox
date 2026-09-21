FROM node:24

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy the rest of the application files
COPY --parents ["*.json", "src/", "./"]

EXPOSE 4200

# Start the frontend in development mode
CMD ["npm", "run", "ng", "serve", "--", "--configuration", "development", "--host", "0.0.0.0"]
