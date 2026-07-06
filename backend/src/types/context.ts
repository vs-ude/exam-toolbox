import { JwtPayload } from "../services/auth.ts";

export type AppEnv = {
  Variables: {
    jwtPayload: JwtPayload;
  };
};
