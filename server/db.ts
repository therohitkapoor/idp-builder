import { drizzle } from "drizzle-orm/mysql2";
import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import {
  InsertUser,
  users,
  idpRecords,
  roleAuditLog,
  InsertRoleAuditLog,
  adminConfigurations,
  credentialAccounts,
  type User,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { canUseLocalPersistence, readLocalJson, writeLocalJson } from "./localPersistence";
import { eq, count, max, desc, inArray } from 'drizzle-orm';
import {
  type AdminConfiguration,
  createDefaultAdminConfiguration,
  normalizeAdminConfiguration,
} from "../shared/adminConfig";

let _db: ReturnType<typeof drizzle> | null = null;
const useLocalPersistence = canUseLocalPersistence;

const PASSWORD_ITERATIONS = 120_000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";

const defaultCredentialSeeds = [
  {
    id: 9001,
    openId: "local:admin@idp.local",
    email: "admin@idp.local",
    password: "Admin@123",
    name: "Admin User",
    role: "admin" as const,
  },
  {
    id: 9002,
    openId: "local:user@idp.local",
    email: "user@idp.local",
    password: "User@123",
    name: "IDP Participant",
    role: "user" as const,
  },
];

const seedEmails = new Set(defaultCredentialSeeds.map((seed) => seed.email));
type LocalCredentialPassword = {
  openId: string;
  password: string;
  participantManaged: boolean;
};

const localCredentialUsers = new Map<string, User>(
  defaultCredentialSeeds.map((seed) => {
    const now = new Date();
    return [
      seed.openId,
      {
        id: seed.id,
        openId: seed.openId,
        name: seed.name,
        email: seed.email,
        loginMethod: "credentials",
        role: seed.role,
        organizationId: null,
        organizationName: null,
        participantId: null,
        createdAt: now,
        updatedAt: now,
        lastSignedIn: now,
      } satisfies User,
    ];
  })
);

const localCredentialPasswords = new Map<string, LocalCredentialPassword>(
  defaultCredentialSeeds.map((seed) => [
    seed.email,
    {
      openId: seed.openId,
      password: seed.password,
      participantManaged: false,
    },
  ])
);
let localNextCredentialUserId = 10000;

type PersistedLocalCredentials = {
  users: Array<Omit<User, "createdAt" | "updatedAt" | "lastSignedIn"> & {
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
    lastSignedIn?: string | Date | null;
  }>;
  passwords: Array<[string, LocalCredentialPassword]>;
  nextCredentialUserId: number;
};

function reviveDate(value: string | Date | null | undefined, fallback = new Date()) {
  if (value instanceof Date) return value;
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function hydrateLocalCredentials() {
  const persisted = readLocalJson<PersistedLocalCredentials | null>("local-credentials.json", null);
  if (!persisted) return;

  localCredentialUsers.clear();
  const now = new Date();
  for (const user of persisted.users || []) {
    if (!user.openId) continue;
    localCredentialUsers.set(user.openId, {
      ...user,
      createdAt: reviveDate(user.createdAt, now),
      updatedAt: reviveDate(user.updatedAt, now),
      lastSignedIn: reviveDate(user.lastSignedIn, now),
    } satisfies User);
  }

  localCredentialPasswords.clear();
  for (const [email, credential] of persisted.passwords || []) {
    if (email && credential?.openId && credential.password) {
      localCredentialPasswords.set(email, credential);
    }
  }

  for (const seed of defaultCredentialSeeds) {
    if (!localCredentialUsers.has(seed.openId)) {
      const now = new Date();
      localCredentialUsers.set(seed.openId, {
        id: seed.id,
        openId: seed.openId,
        name: seed.name,
        email: seed.email,
        loginMethod: "credentials",
        role: seed.role,
        organizationId: null,
        organizationName: null,
        participantId: null,
        createdAt: now,
        updatedAt: now,
        lastSignedIn: now,
      } satisfies User);
    }
    if (!localCredentialPasswords.has(seed.email)) {
      localCredentialPasswords.set(seed.email, {
        openId: seed.openId,
        password: seed.password,
        participantManaged: false,
      });
    }
  }

  localNextCredentialUserId = Math.max(
    persisted.nextCredentialUserId || 10000,
    ...Array.from(localCredentialUsers.values()).map((user) => user.id + 1),
    10000
  );
}

function persistLocalCredentials() {
  writeLocalJson("local-credentials.json", {
    users: Array.from(localCredentialUsers.values()).map((user) => ({
      ...user,
      createdAt: user.createdAt?.toISOString?.() ?? user.createdAt,
      updatedAt: user.updatedAt?.toISOString?.() ?? user.updatedAt,
      lastSignedIn: user.lastSignedIn?.toISOString?.() ?? user.lastSignedIn,
    })),
    passwords: Array.from(localCredentialPasswords.entries()),
    nextCredentialUserId: localNextCredentialUserId,
  } satisfies PersistedLocalCredentials);
}

if (useLocalPersistence) {
  hydrateLocalCredentials();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString("hex");
  return `pbkdf2$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [scheme, iterationsValue, salt, expectedHash] = storedHash.split("$");
  if (scheme !== "pbkdf2" || !iterationsValue || !salt || !expectedHash) return false;

  const iterations = Number(iterationsValue);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const actual = Buffer.from(
    pbkdf2Sync(password, salt, iterations, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString("hex"),
    "hex"
  );
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    const existing = localCredentialUsers.get(user.openId);
    const now = new Date();
    localCredentialUsers.set(user.openId, {
      id: existing?.id ?? localNextCredentialUserId++,
      openId: user.openId,
      name: user.name ?? existing?.name ?? null,
      email: user.email ?? existing?.email ?? null,
      loginMethod: user.loginMethod ?? existing?.loginMethod ?? null,
      role: user.role ?? existing?.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
      organizationId: user.organizationId ?? existing?.organizationId ?? null,
      organizationName: user.organizationName ?? existing?.organizationName ?? null,
      participantId: user.participantId ?? existing?.participantId ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      lastSignedIn: user.lastSignedIn ?? existing?.lastSignedIn ?? now,
    } satisfies User);
    persistLocalCredentials();
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "organizationId", "organizationName", "participantId"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    return localCredentialUsers.get(openId);
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return Array.from(localCredentialUsers.values()).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) {
    for (const [openId, user] of Array.from(localCredentialUsers.entries())) {
      if (user.id === userId) {
        localCredentialUsers.set(openId, { ...user, role, updatedAt: new Date() });
        persistLocalCredentials();
        return;
      }
    }
    throw new Error('User not found');
  }
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getUserIdpStats() {
  const db = await getDb();
  if (!db) return [];
  const stats = await db
    .select({
      userId: idpRecords.userId,
      idpCount: count(idpRecords.id),
      lastGenerated: max(idpRecords.createdAt),
    })
    .from(idpRecords)
    .groupBy(idpRecords.userId);
  return stats;
}

export async function insertRoleAuditLog(entry: InsertRoleAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(roleAuditLog).values(entry);
}

export async function getRoleAuditLog(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(roleAuditLog).orderBy(desc(roleAuditLog.createdAt)).limit(limit);
}

export async function deleteIdpById(idpId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(idpRecords).where(eq(idpRecords.id, idpId));
}

export async function deleteIdpsByIds(idpIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (idpIds.length === 0) return;
  await db.delete(idpRecords).where(inArray(idpRecords.id, idpIds));
}

async function ensureSeedCredentialAccount(seed: (typeof defaultCredentialSeeds)[number]): Promise<User | null> {
  const db = await getDb();
  if (!db) return localCredentialUsers.get(seed.openId) ?? null;

  await upsertUser({
    openId: seed.openId,
    name: seed.name,
    email: seed.email,
    loginMethod: "credentials",
    role: seed.role,
    lastSignedIn: new Date(),
  });

  const user = await getUserByOpenId(seed.openId);
  if (!user) return null;

  await db.insert(credentialAccounts).values({
    userId: user.id,
    email: seed.email,
    passwordHash: hashPassword(seed.password),
  }).onDuplicateKeyUpdate({
    set: {
      userId: user.id,
      passwordHash: hashPassword(seed.password),
    },
  });

  return user;
}

export async function loginWithCredentials(email: string, password: string): Promise<User | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) return null;

  const seed = defaultCredentialSeeds.find((account) => account.email === normalizedEmail);
  const db = await getDb();

  if (!db) {
    const credential = localCredentialPasswords.get(normalizedEmail);
    if (!credential || credential.password !== password) return null;
    const user = localCredentialUsers.get(credential.openId);
    if (!user) return null;
    const updatedUser = { ...user, lastSignedIn: new Date(), updatedAt: new Date() };
    localCredentialUsers.set(credential.openId, updatedUser);
    persistLocalCredentials();
    return updatedUser;
  }

  let credentialRows = await db
    .select()
    .from(credentialAccounts)
    .where(eq(credentialAccounts.email, normalizedEmail))
    .limit(1);

  if (!credentialRows[0] && seed) {
    await ensureSeedCredentialAccount(seed);
    credentialRows = await db
      .select()
      .from(credentialAccounts)
      .where(eq(credentialAccounts.email, normalizedEmail))
      .limit(1);
  }

  const credential = credentialRows[0];
  if (!credential || !verifyPassword(password, credential.passwordHash)) return null;

  const matchedUsers = await db.select().from(users).where(eq(users.id, credential.userId)).limit(1);
  const user = matchedUsers[0];
  if (!user) return null;

  await upsertUser({
    openId: user.openId,
    lastSignedIn: new Date(),
  });

  return (await getUserByOpenId(user.openId)) ?? user;
}

function syncLocalParticipantCredentialUsers(config: AdminConfiguration) {
  const normalized = normalizeAdminConfiguration(config);
  const organizationsById = new Map(normalized.organizations.map((organization) => [organization.id, organization]));
  const nextParticipantOpenIds = new Set<string>();

  for (const [email, credential] of Array.from(localCredentialPasswords.entries())) {
    if (credential.participantManaged) {
      localCredentialPasswords.delete(email);
      localCredentialUsers.delete(credential.openId);
    }
  }

  normalized.participants.forEach((participant) => {
    const email = normalizeEmail(participant.email || "");
    if (!email || !participant.generatedPassword || seedEmails.has(email)) return;

    const openId = `local:${email}`;
    nextParticipantOpenIds.add(openId);
    const existing = localCredentialUsers.get(openId);
    const organization = organizationsById.get(participant.organizationId);
    const now = new Date();
    localCredentialUsers.set(openId, {
      id: existing?.id ?? localNextCredentialUserId++,
      openId,
      name: participant.name || email,
      email,
      loginMethod: "credentials",
      role: "user",
      organizationId: participant.organizationId,
      organizationName: organization?.organizationName || null,
      participantId: participant.id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      lastSignedIn: existing?.lastSignedIn ?? now,
    } satisfies User);
    localCredentialPasswords.set(email, {
      openId,
      password: participant.generatedPassword,
      participantManaged: true,
    });
  });

  for (const [openId, user] of Array.from(localCredentialUsers.entries())) {
    if (user.participantId && !nextParticipantOpenIds.has(openId)) {
      localCredentialUsers.delete(openId);
    }
  }
  persistLocalCredentials();
}

export async function syncParticipantCredentialUsers(config: AdminConfiguration): Promise<void> {
  const normalized = normalizeAdminConfiguration(config);
  const db = await getDb();
  if (!db) {
    syncLocalParticipantCredentialUsers(normalized);
    return;
  }

  const organizationsById = new Map(normalized.organizations.map((organization) => [organization.id, organization]));
  for (const participant of normalized.participants) {
    const email = normalizeEmail(participant.email || "");
    if (!email || !participant.generatedPassword || seedEmails.has(email)) continue;

    const organization = organizationsById.get(participant.organizationId);
    const openId = `local:${email}`;
    await upsertUser({
      openId,
      name: participant.name || email,
      email,
      loginMethod: "credentials",
      role: "user",
      organizationId: participant.organizationId,
      organizationName: organization?.organizationName || null,
      participantId: participant.id,
    });

    const user = await getUserByOpenId(openId);
    if (!user) continue;
    await db.insert(credentialAccounts).values({
      userId: user.id,
      email,
      passwordHash: hashPassword(participant.generatedPassword),
    }).onDuplicateKeyUpdate({
      set: {
        userId: user.id,
        passwordHash: hashPassword(participant.generatedPassword),
      },
    });
  }
}

let localAdminConfiguration = normalizeAdminConfiguration(
  useLocalPersistence
    ? readLocalJson<AdminConfiguration>("local-admin-config.json", createDefaultAdminConfiguration())
    : createDefaultAdminConfiguration()
);

export async function getAdminConfiguration(): Promise<AdminConfiguration> {
  const db = await getDb();
  if (!db) return localAdminConfiguration;

  const existing = await db
    .select()
    .from(adminConfigurations)
    .where(eq(adminConfigurations.name, "default"))
    .limit(1);

  if (!existing[0]?.settings) {
    return createDefaultAdminConfiguration();
  }

  return normalizeAdminConfiguration(existing[0].settings);
}

export async function saveAdminConfiguration(
  config: AdminConfiguration,
  updatedBy?: number
): Promise<AdminConfiguration> {
  const normalized = normalizeAdminConfiguration(config);
  await syncParticipantCredentialUsers(normalized);
  const db = await getDb();
  if (!db) {
    localAdminConfiguration = normalized;
    writeLocalJson("local-admin-config.json", normalized);
    return normalized;
  }

  const existing = await db
    .select({ id: adminConfigurations.id })
    .from(adminConfigurations)
    .where(eq(adminConfigurations.name, "default"))
    .limit(1);

  if (existing[0]) {
    await db
      .update(adminConfigurations)
      .set({ settings: normalized, updatedBy })
      .where(eq(adminConfigurations.id, existing[0].id));
  } else {
    await db.insert(adminConfigurations).values({
      name: "default",
      settings: normalized,
      updatedBy,
    });
  }

  return normalized;
}
