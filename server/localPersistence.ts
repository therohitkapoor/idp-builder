import { chmodSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const localDataDir = process.env.IDP_LOCAL_DATA_DIR || path.join(process.cwd(), "data");
const isTestRuntime = Boolean(process.env.VITEST || process.env.VITEST_WORKER_ID);
const useLocalDatabase = !process.env.DATABASE_URL;
const localDatabasePath =
  process.env.IDP_LOCAL_DB_PATH || (isTestRuntime ? ":memory:" : path.join(localDataDir, "idp-local.sqlite"));
const nodeRequire = createRequire(import.meta.url);
type DatabaseSync = import("node:sqlite").DatabaseSync;
let localDatabase: DatabaseSync | null = null;

function ensureLocalDataDir() {
  mkdirSync(localDataDir, { recursive: true, mode: 0o700 });
}

function legacyLocalDataPath(fileName: string) {
  ensureLocalDataDir();
  return path.join(localDataDir, fileName);
}

function getLocalDatabase() {
  if (localDatabase) return localDatabase;
  ensureLocalDataDir();

  const { DatabaseSync } = nodeRequire("node:sqlite") as typeof import("node:sqlite");
  localDatabase = new DatabaseSync(localDatabasePath);
  localDatabase.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS uploaded_documents (
      key TEXT PRIMARY KEY,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      source_type TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      hash TEXT NOT NULL,
      url TEXT,
      extracted_text TEXT,
      extracted_summary TEXT,
      content BLOB,
      uploaded_by TEXT,
      organization_id TEXT,
      uploaded_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  protectLocalDatabaseFiles();

  return localDatabase;
}

function protectLocalDatabaseFiles() {
  if (isTestRuntime || localDatabasePath === ":memory:") return;
  for (const filePath of [localDatabasePath, `${localDatabasePath}-wal`, `${localDatabasePath}-shm`]) {
    if (!existsSync(filePath)) continue;
    try {
      chmodSync(filePath, 0o600);
    } catch {
      // Best-effort local hardening only.
    }
  }
}

export function readLocalJson<T>(fileName: string, fallback: T): T {
  if (!useLocalDatabase) return fallback;
  const db = getLocalDatabase();
  const key = `json:${fileName}`;

  try {
    const row = db
      .prepare("SELECT value FROM app_state WHERE key = ?")
      .get(key) as { value?: string } | undefined;

    if (row?.value) {
      return JSON.parse(row.value) as T;
    }

    const legacyPath = legacyLocalDataPath(fileName);
    if (!existsSync(legacyPath)) return fallback;

    const legacyValue = JSON.parse(readFileSync(legacyPath, "utf8")) as T;
    writeLocalJson(fileName, legacyValue);
    return legacyValue;
  } catch (error) {
    console.warn(`[LocalPersistence] Could not read ${fileName}; using fallback.`, error);
    return fallback;
  }
}

export function writeLocalJson(fileName: string, value: unknown) {
  if (!useLocalDatabase) return;
  try {
    const db = getLocalDatabase();
    db.prepare(`
      INSERT INTO app_state (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `).run(`json:${fileName}`, JSON.stringify(value));
  } catch (error) {
    console.warn(`[LocalPersistence] Could not write ${fileName}; continuing with in-memory state.`, error);
  }
}

export type LocalUploadedDocument = {
  id: string;
  name: string;
  key: string;
  sourceType: string;
  mimeType: string;
  size: number;
  hash: string;
  url?: string;
  extractedText?: string;
  extractedSummary?: string;
  content?: Buffer;
  uploadedBy?: string | null;
  organizationId?: string | null;
  uploadedAt: string;
};

export function saveLocalUploadedDocument(document: LocalUploadedDocument) {
  if (!useLocalDatabase) return;
  try {
    const db = getLocalDatabase();
    db.prepare(`
      INSERT INTO uploaded_documents (
        key,
        id,
        name,
        source_type,
        mime_type,
        size,
        hash,
        url,
        extracted_text,
        extracted_summary,
        content,
        uploaded_by,
        organization_id,
        uploaded_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        id = excluded.id,
        name = excluded.name,
        source_type = excluded.source_type,
        mime_type = excluded.mime_type,
        size = excluded.size,
        hash = excluded.hash,
        url = excluded.url,
        extracted_text = excluded.extracted_text,
        extracted_summary = excluded.extracted_summary,
        content = excluded.content,
        uploaded_by = excluded.uploaded_by,
        organization_id = excluded.organization_id,
        uploaded_at = excluded.uploaded_at,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      document.key,
      document.id,
      document.name,
      document.sourceType,
      document.mimeType,
      document.size,
      document.hash,
      document.url || "",
      document.extractedText || "",
      document.extractedSummary || "",
      document.content || null,
      document.uploadedBy || null,
      document.organizationId || null,
      document.uploadedAt
    );
  } catch (error) {
    console.warn("[LocalPersistence] Could not save uploaded document in local database.", error);
  }
}
