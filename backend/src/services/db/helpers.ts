import { User } from '../../types/mod.ts';

/**
 * Constructs a MongoDB filter based on the user. Filter matches if the
 * user.sub or one of their groups is in the access list.
 */
export function accessFilter(user: User) {
  return {
    $or: [
      { 'access.users': user.sub },
      { 'access.groups': { $in: user.groups } },
    ],
  };
}
