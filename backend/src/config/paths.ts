export const TEMPLATE_BASE_PATH = Deno.env.get("TEMPLATE_BASE_PATH") ||
  "/app/template";

export const CACHE_DIR = Deno.env.get("CACHE_DIR") || "/app/cache";
export const QR_CACHE_PATH = `${CACHE_DIR}/qr`;
