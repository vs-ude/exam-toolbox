import { appConfig } from "./appConfig.ts";

export const config = {
  cachePath: `${appConfig.paths.cacheDir}/qr`,
  minStudents: appConfig.qr.minStudents,
  minPages: appConfig.qr.minPages,
};
