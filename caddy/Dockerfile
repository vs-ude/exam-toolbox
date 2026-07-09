FROM caddy:builder-alpine AS caddy_builder

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    xcaddy build --with github.com/hookenz/caddy-signed-urls@latest

# final caddy image with frontend (copied static files) and custom caddy
FROM caddy:alpine

COPY --from=caddy_builder /usr/bin/caddy /usr/bin/caddy

# copy static frontend files to custom caddy build
COPY --parents ./public /srv/

ENV LOGLEVEL=warn

# Mark where to put the Caddyfile
VOLUME /etc/caddy/

VOLUME /srv/uploads/
