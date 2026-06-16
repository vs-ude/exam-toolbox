#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  printf "Usage: %s <packages-file>\n" "$0" >&2
  exit 1
fi

PACKAGES_FILE="$1"
if [[ ! -f "$PACKAGES_FILE" ]]; then
  printf "Packages file not found: %s\n" "$PACKAGES_FILE" >&2
  exit 1
fi

mapfile -t packages < <(grep -vE '^\s*($|#)' "$PACKAGES_FILE")
if [[ ${#packages[@]} -eq 0 ]]; then
  printf "No packages found in %s\n" "$PACKAGES_FILE" >&2
  exit 1
fi

PROJECT_DIR="${CI_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
APT_CACHE_DIR="${PROJECT_DIR}/.apt-cache"
APT_LISTS_DIR="${APT_CACHE_DIR}/lists"
APT_ARCHIVES_DIR="${APT_CACHE_DIR}/archives"

mkdir -p "${APT_LISTS_DIR}/partial" "${APT_ARCHIVES_DIR}/partial"

apt_opts=(
  -o "Dir::State::lists=${APT_LISTS_DIR}"
  -o "Dir::Cache::archives=${APT_ARCHIVES_DIR}"
)

if ! find "${APT_LISTS_DIR}" -maxdepth 1 -type f -name '*_Packages*' | grep -q .; then
  printf "Apt package lists not cached, updating apt cache...\n"
  apt-get "${apt_opts[@]}" update -qy
fi

apt-get "${apt_opts[@]}" install -qy -o=Dpkg::Use-Pty=0 --no-install-recommends "${packages[@]}"
