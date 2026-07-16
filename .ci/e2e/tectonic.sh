#!/usr/bin/bash -e

TECTONIC_VERSION=${TECTONIC_VERSION:-"0.16.9"}
BASE_URL=${BASE_URL:-"https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}"}

TEMPLATE_PATH=${PATHS_TEMPLATE_BASE_PATH:-"${HOME}/exam-toolbox/backend/template"}

ARCH=`uname -m`
case "$ARCH" in
  x86_64|x64)
    URL="${BASE_URL}/tectonic-${TECTONIC_VERSION}-x86_64-unknown-linux-musl.tar.gz"
    ;;
  aarch64|arm64|armv8*)
    URL="${BASE_URL}/tectonic-${TECTONIC_VERSION}-aarch64-unknown-linux-musl.tar.gz"
    ;;
  arm)
    URL="${BASE_URL}/tectonic-${TECTONIC_VERSION}-arm-unknown-linux-musleabihf.tar.gz"
    ;;
  *)
    echo "Unknown architecture: $ARCH; exiting"
    exit 1
    ;;
esac

cd /tmp
curl -qL "$URL" -o tectonic.tar.gz 2>/dev/null
tar -xzf tectonic.tar.gz
rm -f tectonic.tar.gz
mv tectonic /usr/local/bin/

echo "Preparing tectonic cache..."
echo "Saving cache in ${HOME}/.cache/Tectonic"
echo "${CI_PROJECT_DIR}"
cd "$TEMPLATE_PATH"
LOG="$CI_PROJECT_DIR/.logs"
mkdir -p ${LOG}
HOME="${CI_PROJECT_DIR}" tectonic -X compile exam.tex --untrusted >"$LOG/tectonic.log" 2>&1
ls -l ${CI_PROJECT_DIR}/.cache/Tectonic
