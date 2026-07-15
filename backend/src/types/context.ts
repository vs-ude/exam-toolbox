import { JwtVariables } from '@hono/hono/jwt';
import { User } from '../types/user.ts';

/**
 * Represents the payload of a JWT.
 */
export interface JwtPayload extends Omit<User, 'active' | 'lastLoginAt'> {
  iat: number;
  exp: number;
}

/**
 * Represents the environment variables for the application.
 */
export type AppEnv = {
  Variables: JwtVariables<JwtPayload>;
};
