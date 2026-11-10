/**
 * The keyring's records in IndexedDB, one per key, by fingerprint. Public
 * keys are stored as they are; a secret key as openpgp.js armors it — still
 * encrypted with its passphrase, which is never stored anywhere.
 *
 * Every window of the app on this origin shares the store; a change is
 * announced on a BroadcastChannel, and the other windows read it again.
 */

import type { KeyRecord, KeyStore } from '../core/keyring';
import { MemoryStore } from '../core/keyring';

const DB = 'html-pgp';
const STORE = 'keys';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'fingerprint' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB'));
    request.onblocked = () => reject(new Error('IndexedDB is blocked by another window'));
  });
}

const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('html-pgp') : null;

export class IdbStore implements KeyStore {
  private constructor(private readonly db: IDBDatabase) {}

  static async open(): Promise<IdbStore> {
    return new IdbStore(await openDb());
  }

  private run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(STORE, mode);
      const request = work(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB'));
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB'));
    });
  }

  async load(): Promise<KeyRecord[]> {
    return this.run('readonly', (store) => store.getAll() as IDBRequest<KeyRecord[]>);
  }

  async save(record: KeyRecord): Promise<void> {
    await this.run('readwrite', (store) => store.put(record));
    channel?.postMessage('changed');
  }

  async remove(fingerprint: string): Promise<void> {
    await this.run('readwrite', (store) => store.delete(fingerprint));
    channel?.postMessage('changed');
  }
}

/** The page's store; in memory when IndexedDB is not there — the keys then last as long as the page. */
export async function openStore(): Promise<{ store: KeyStore; persistent: boolean }> {
  try {
    return { store: await IdbStore.open(), persistent: true };
  } catch {
    return { store: new MemoryStore(), persistent: false };
  }
}

/** Another window changed the keyring. */
export function onStoreChanged(listener: () => void): void {
  channel?.addEventListener('message', (event) => {
    if (event.data === 'changed') listener();
  });
}

/**
 * Asks the browser not to clear the keyring when space runs short. Firefox shows
 * a prompt for it, so this is called after the user did something with a secret
 * key, never on start.
 */
export function keepStorage(): void {
  void navigator.storage?.persist?.().catch(() => undefined);
}
