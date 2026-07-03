import { getConfig } from "./appConfig.ts";

const config = getConfig();

export const qrConfig = {
  cachePath: `${config.paths.cacheDir}/qr`,
  minStudents: config.qr.minStudents,
  minPages: config.qr.minPages,
};
