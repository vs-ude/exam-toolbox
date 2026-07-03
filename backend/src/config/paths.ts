import { getConfig } from "./appConfig.ts";

const config = getConfig();

export const TEMPLATE_BASE_PATH = config.paths.templateBase;
export const CACHE_DIR = config.paths.cacheDir;
