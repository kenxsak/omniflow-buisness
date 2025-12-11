
"use client";
import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

const DB_NAME = 'OmniFlowContentDB';
const DB_VERSION = 1;
const POST_STORE_NAME = 'socialPosts';

interface OmniFlowDB extends DBSchema {
  [POST_STORE_NAME]: {
    key: string;
    value: any; // Using `any` for simplicity to store the SocialMediaPost object
    indexes: { 'createdAt': string };
  };
}

let dbPromise: Promise<IDBPDatabase<OmniFlowDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<OmniFlowDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<OmniFlowDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(POST_STORE_NAME)) {
          const store = db.createObjectStore(POST_STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
};

export async function idbGetAll(storeName: string): Promise<any[]> {
  const db = await getDb();
  return db.getAllFromIndex(storeName, 'createdAt');
}

export async function idbGet(storeName: string, key: string): Promise<any | undefined> {
  const db = await getDb();
  return db.get(storeName, key);
}

export async function idbPut(storeName: string, value: any): Promise<string> {
  const db = await getDb();
  return db.put(storeName, value);
}

export async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await getDb();
  return db.delete(storeName, key);
}
