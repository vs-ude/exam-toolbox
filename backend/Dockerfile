# Build tectonic and prime the cache
FROM rust:latest AS builder
RUN apt-get update && apt-get install -qy -o=Dpkg::Use-Pty=0 --no-install-recommends \
    libfontconfig-dev libgraphite2-dev libharfbuzz-dev libicu-dev zlib1g-dev

RUN --mount=type=cache,target=/usr/local/cargo/git/db \
    --mount=type=cache,target=/usr/local/cargo/registry/ \
    cargo install --git https://github.com/tectonic-typesetting/tectonic.git --rev d7f3275 --force tectonic

WORKDIR /tmp
ENV HOME=/tmp
COPY --exclude="*.template.tex" --exclude="task_types/*" "template/" "/tmp/"
RUN --mount=type=cache,target=/tmp/.cache tectonic -X compile exam.tex --untrusted && cp -r /tmp/.cache /root/.cache


# Use a Debian-based image with Deno
FROM denoland/deno:latest

# Install necessary tools and libraries
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update \
    && apt-get install -qy -o=Dpkg::Use-Pty=0 --no-install-recommends \
    libfontconfig libgraphite2-3 libharfbuzz0b libicu76 zlib1g libharfbuzz-icu0 libssl3 ca-certificates \
    ghostscript imagemagick zip \
    zbar-tools qrencode \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/cargo/bin/tectonic /usr/bin/
COPY --from=builder --chmod=ugo=rwX /root/.cache/ /root/.cache/

# Set the working directory
WORKDIR /app

COPY deno.json deno.lock /app/
RUN --mount=type=cache,target=/root/.deno deno install

COPY --parents template/ /app/
COPY --parents src/ server.ts /app/

# Expose the server port
EXPOSE 3000

# Set environment variables
ENV MONGODB_URI=mongodb://mongo:27017/examToolboxDB

# Run the server.ts script using Deno
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-write", "--allow-read", "--allow-run", "--allow-import", "--allow-sys", "--watch", "server.ts"]
