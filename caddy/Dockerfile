FROM node:22-alpine AS angular_build

WORKDIR /usr/src/app

# copy package files from the frontend directory
COPY ../frontend/package*.json ./
RUN npm install

# copy frontend source code
COPY ../frontend/ .

# build application but ensure the output path matches the original
RUN npm run build --configuration=production --output-path=./dist/frontend/browser


FROM caddy:latest

# copy static build files (npm run build) to /srv/app (caddy)
COPY --from=angular_build /usr/src/app/dist/frontend/browser/ /srv/app/