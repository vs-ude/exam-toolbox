FROM node:22-alpine AS angular_build

WORKDIR /usr/src/app

# copy package files from the frontend directory
COPY ../frontend/package*.json ./
RUN npm install

# copy frontend source code
COPY ../frontend/ .

# build application but ensure the output path matches the original
RUN npm run build --configuration=production --output-path=./dist/frontend/browser



# go is is required
FROM golang:1.24-alpine AS caddy_builder

# install xcaddy
RUN go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest

# build caddy with caddy-security (custom caddy)
RUN xcaddy build --with github.com/greenpau/caddy-security@latest



# final caddy image with frontend (copied static files) and custom caddy
FROM caddy:2.8.4-alpine

# copy and override caddy:2.8.4-alpine with custom caddy build from step before
COPY --from=caddy_builder /go/caddy /usr/bin/caddy

# copy static frontend files to custom caddy build
COPY --from=angular_build /usr/src/app/dist/frontend/browser/ /srv/app
