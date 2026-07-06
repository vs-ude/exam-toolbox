import { Client, Entry, NoSuchObjectError } from "ldapts";
import { sign } from "@hono/hono/jwt";

import { getConfig } from "../config/appConfig.ts";
import { HttpError } from "../types/handler.ts";
import { Rights, User } from "../types/user.ts";

import { getOrCreateDb } from "./db.ts";

const config = getConfig().auth;
const LDAP_USER_FIELDS = ["uid", "cn", "sn", "givenName", "mail", "memberOf"];

/**
 * Represents the payload of a JWT.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  groups: string[];
  iat: number;
  exp: number;
}

const SAFE_CHARS = /^[A-Za-z0-9._@-]+$/;

/**
 * Sanitizes the input value to prevent LDAP injection attacks.
 * @param value The input value to sanitize.
 * @param field The field name for error messages.
 * @returns The sanitized value.
 */
function sanitizeInput(value: string, field: string): string {
  if (!SAFE_CHARS.test(value)) {
    throw new HttpError(
      400,
      `Invalid characters in ${field}. Only alphanumerics and ._@- are allowed.`,
    );
  }
  return value;
}

/**
 * Waits for the LDAP connection to be established within the specified timeout.
 * @param timeout The maximum time to wait in seconds.
 */
export async function waitForLdapConnection(timeout: number) {
  let count = 0;
  while (count < timeout) {
    try {
      await testLDAPConnection();
      return;
    } catch {
      console.info("LDAP connection failed, retrying...");
      count++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("Timed out while waiting for LDAP connection.");
}

/**
 * Tests the LDAP connection by binding as the service account.
 */
export async function testLDAPConnection() {
  const client = new Client({ url: config.ldap.url });

  try {
    await client.bind(config.ldap.bindDn, config.ldap.bindPassword);
  } catch (error) {
    console.warn(`Unable to bind to LDAP server ${config.ldap.url}`);
    console.warn(error);
    throw error;
  } finally {
    try {
      await client.unbind();
    } catch {
      // ignore unbind errors
    }
  }
}

/**
 * Authenticates a user against the LDAP server using the provided credentials.
 * @param username The user's username.
 * @param password The user's password.
 * @returns The signed JWT with the user's information.
 */
export async function authenticate(
  username: string,
  password: string,
): Promise<string> {
  const safeUsername = sanitizeInput(username, "username");

  const client = new Client({ url: config.ldap.url });

  try {
    // 1. Bind as service account
    await client.bind(config.ldap.bindDn, config.ldap.bindPassword);

    // 2. Search for the user
    const filter = config.ldap.searchFilter.replace(
      /%s/g,
      safeUsername,
    );
    const { searchEntries } = await client.search(config.ldap.searchBase, {
      filter,
      scope: "sub",
      attributes: ["dn"].concat(LDAP_USER_FIELDS),
    });

    if (searchEntries.length === 0) {
      throw new HttpError(401, "User not found");
    }
    const entry = searchEntries[0];

    // 3. Check required group membership
    if (!isInRequiredGroup(entry.memberOf as string | string[])) {
      throw new HttpError(403, "User is not a member of the required group");
    }

    const user = ldapEntityToUser(entry);

    // 4. Re-bind as user to verify password
    try {
      await client.bind(entry.dn, password);
    } catch {
      throw new HttpError(401, "Invalid credentials");
    }

    // 5. Sync to DB
    const db = await getOrCreateDb();
    await db.upsertUser(user);

    // Ensure the payload is in the format we expect in validation
    const payload: JwtPayload = {
      sub: user.uid,
      email: user.email,
      name: user.name,
      groups: user.groups,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) +
        config.jwt.lifetimeDays * 24 * 60 * 60,
    };

    // 6. Sign and return JWT
    return await sign(
      {
        ...payload,
      },
      config.jwt.secret,
      "HS384",
    );
    // return await signJwt({
    //   sub: user.uid,
    //   email: user.email,
    //   name: user.name,
    //   groups: user.groups,
    // });
  } finally {
    try {
      await client.unbind();
    } catch {
      // ignore unbind errors
    }
  }
}

/**
 * Checks whether the groups defined in the config actually exist in LDAP and puts them into the database.
 *
 * @throws If one of the configured groups is not found in LDAP.
 */
export async function setupConfiguredGroups(): Promise<void> {
  console.info("Setting up configured groups", config.ldap.groups);
  const client = new Client({ url: config.ldap.url });
  await client.bind(config.ldap.bindDn, config.ldap.bindPassword);

  const db = await getOrCreateDb();
  async function checkAndUpsert(group: string, rights: undefined | Rights) {
    try {
      const { searchEntries } = await client.search(`${groupDn(group)}`, {
        filter: "(objectClass=*)",
        scope: "base",
        attributes: [""],
      });
      if (searchEntries.length === 0) {
        throw new Error(`Group ${group} not found in LDAP`);
      }
    } catch (e) {
      if (e instanceof NoSuchObjectError) {
        throw new Error(`Failed to search group ${group}: ${e.message}`);
      }
      throw e;
    }
    if (rights !== undefined) {
      console.debug(`Set up group: ${group} with rights: ${rights}`);
      await db.upsertGroup({ name: group, rights });
    }
  }

  try {
    await checkAndUpsert(config.ldap.groups.required, undefined);
    await Promise.all(config.ldap.groups.admin.map(async (group) => {
      await checkAndUpsert(group, "admin");
    }));
    await Promise.all(config.ldap.groups.full.map(async (group) => {
      await checkAndUpsert(group, "full");
    }));
  } finally {
    try {
      await client.unbind();
    } catch (_) {
      // Ignore unbind errors
    }
  }
}

/**
 * Fetches all users in the required LDAP group and syncs them (and their groups)
 * to the database. Intended to be called on-demand when access rights need to
 * be configured — not on every login.
 *
 * @returns A list of UIDs of the synced users.
 */
export async function syncLdapUsers(): Promise<string[]> {
  const client = new Client({ url: config.ldap.url });

  try {
    await client.bind(config.ldap.bindDn, config.ldap.bindPassword);

    // Search for all users that are members of the required group
    const { searchEntries } = await client.search(config.ldap.searchBase, {
      filter: `(memberOf=${groupDn(config.ldap.groups.required)})`,
      scope: "sub",
      attributes: LDAP_USER_FIELDS,
    });

    const db = await getOrCreateDb();
    const uids: string[] = [];

    for (const entry of searchEntries) {
      const user = ldapEntityToUser(entry);
      await db.upsertUser(user);
      uids.push(user.uid);
    }

    return uids;
  } finally {
    try {
      await client.unbind();
    } catch {
      // ignore unbind errors
    }
  }
}

/**
 * Converts an LDAP entry to a User object.
 *
 * @param entry The LDAP entry to convert.
 * @returns The converted {@link User} object.
 */
function ldapEntityToUser(entry: Entry): User {
  const uid = (Array.isArray(entry.uid) ? entry.uid[0] : entry.uid) as string;
  const cn = (Array.isArray(entry.cn) ? entry.cn[0] : entry.cn ?? "") as string;
  const sn = (Array.isArray(entry.sn) ? entry.sn[0] : entry.sn ?? "") as string;
  const givenName =
    (Array.isArray(entry.givenName)
      ? entry.givenName[0]
      : entry.givenName ?? "") as string;
  const email =
    (Array.isArray(entry.mail) ? entry.mail[0] : entry.mail ?? "") as string;
  const memberOf: string[] = entry.memberOf
    ? (Array.isArray(entry.memberOf)
      ? entry.memberOf
      : [entry.memberOf]) as string[]
    : [];

  const name = cn || `${givenName ?? ""} ${sn}`.trim() || uid;

  return {
    uid,
    name,
    email,
    groups: filterGroups(memberOf),
    active: true,
  };
}

/**
 * Constructs the full DN for a given group name.
 *
 * @param name The name of the group.
 * @returns The full DN of the group.
 */
function groupDn(name: string): string {
  return config.ldap.groupDnBase.replace("%s", name);
}

/**
 * Filters a list of group DNs down to the ones configured in the LDAP settings.
 *
 * @param groups The list of group DNs to filter.
 * @returns The filtered list of group names (not DN!).
 */
function filterGroups(groups: string[]): string[] {
  const targets = [config.ldap.groups.required].concat(config.ldap.groups.admin)
    .concat(config.ldap.groups.full);
  let result: string[] = [];
  targets.forEach((group) => {
    if (groups.includes(groupDn(group))) {
      result = result.concat(group);
    }
  });
  return result;
}

/**
 * Checks if the user is in the required group.
 *
 * @param memberOf The user's group memberships as retrieved from the LDAP entry.
 * @returns `true` if the user is in the required group, `false` otherwise.
 */
function isInRequiredGroup(
  memberOf: string | string[],
): boolean {
  let list: string[] = [];
  if (typeof memberOf === "string") {
    list = [memberOf];
  } else if (Array.isArray(memberOf)) {
    list = memberOf as string[];
  }
  return list.some((group) => group === groupDn(config.ldap.groups.required));
}
