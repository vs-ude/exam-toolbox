import { ExamToolboxDatabase } from '../mod.ts';
import { newId } from '@diister/mongodbee';
import { User, UserStub, Group } from '../../types/mod.ts';

// ── Users ─────────────────────────────────────────────────────────────────

export async function upsertUser(
  this: ExamToolboxDatabase,
  user: User,
): Promise<void> {
  const now = new Date();
  await this.collections.users.updateOne(
    { sub: user.sub },
    {
      $set: user,
      $setOnInsert: { _id: `user:${newId()}`, createdAt: now },
    },
    { upsert: true },
  );
}

export async function updateUserLogin(
  this: ExamToolboxDatabase,
  user: User,
): Promise<void> {
  const now = new Date();
  await this.collections.users.updateOne(
    { sub: user.sub },
    { $set: { lastLoginAt: now } },
  );
}

/**
 * Deactivates all users except those specified in the `uids` array.
 */
export async function deactivateOtherUids(
  this: ExamToolboxDatabase,
  uids: string[],
): Promise<void> {
  await this.collections.users.updateMany(
    { sub: { $nin: uids } },
    { $set: { active: false } },
  );
}

export async function getUserById(
  this: ExamToolboxDatabase,
  id: string,
): Promise<User | undefined> {
  const result = await this.collections.users.findOne({ sub: id });
  return result as User | undefined;
}

export async function getAllUserStubs(
  this: ExamToolboxDatabase,
): Promise<UserStub[]> {
  const results = await this.collections.users
    .find({
      active: true,
    })
    .toArray();
  return results.map((res: any) => {
    const { _id, ...rest } = res;
    void _id;
    return rest as UserStub;
  });
}

export async function getUsers(
  this: ExamToolboxDatabase,
  uids: string[],
): Promise<User[]> {
  const results = await this.collections.users
    .find({ sub: { $in: uids } })
    .toArray();
  return results.map((res: any) => {
    const { _id, ...rest } = res;
    void _id;
    return rest as User;
  });
}

// ── Groups ────────────────────────────────────────────────────────────────

export async function upsertGroup(
  this: ExamToolboxDatabase,
  group: Group,
): Promise<void> {
  await this.collections.groups.updateOne(
    { name: group.name },
    { $set: group, $setOnInsert: { _id: `group:${newId()}` } },
    { upsert: true },
  );
}

export async function getGroups(this: ExamToolboxDatabase): Promise<Group[]> {
  const results = await this.collections.groups.find({}).toArray();
  return results as unknown as Group[];
}
