const STORAGE_KEY = 'camdoc.gemini-api-key';

export interface ApiKeyStorage {
  hasKey(): boolean;
  getKey(): string | null;
  setKey(value: string): void;
  removeKey(): void;
}

export function createLocalStorageKeyStore(storage: Storage = window.localStorage): ApiKeyStorage {
  return {
    hasKey: () => Boolean(storage.getItem(STORAGE_KEY)),
    getKey: () => storage.getItem(STORAGE_KEY),
    setKey: (value) => storage.setItem(STORAGE_KEY, value),
    removeKey: () => storage.removeItem(STORAGE_KEY),
  };
}

export { STORAGE_KEY };