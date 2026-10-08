# Fetch tectonic and prime the cache
FROM debian:12 AS builder
ARG TARGETARCH
ARG TECTONIC_VERSION=0.17.0

RUN apt-get update && apt-get install -qy -o=Dpkg::Use-Pty=0 --no-install-recommends \
    curl ca-certificates libfontconfig-dev libgraphite2-dev libharfbuzz-dev libicu-dev zlib1g-dev

WORKDIR /tmp
RUN echo "Pulling tectonic for ${TARGETARCH}" && \
    if [ "$TARGETARCH" = "amd64" ]; then \
        export TECTONIC_ARCH="x86_64"; \
      elif [ "$TARGETARCH" = "arm64" ]; then \
        export TECTONIC_ARCH="aarch64"; \
      else \
        echo "Unsupported architecture" \
      && exit 1; \
    fi && \
    export _url="https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-${TECTONIC_ARCH}-unknown-linux-musl.tar.gz" \
    && echo "Downloading from ${_url}" \
    && curl -L ${_url} -o /tmp/tectonic.tar.gz \
    && tar xzf /tmp/tectonic.tar.gz -C /tmp/ \
    && mv /tmp/tectonic /usr/local/bin/

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

COPY --from=builder /usr/local/bin/tectonic /usr/local/bin/
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
ENV MONGODB_URI=mongodb://mongo:27017/examToolboxDB?replicaSet=rs0&directConnection=true

# Run the server.ts script using Deno
CMD ["deno", "task", "start:watch"]
