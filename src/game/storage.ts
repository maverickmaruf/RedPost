// localStorage that never throws: private mode, blocked storage and full quota all degrade to memory.
const PREFIX = 'redoutpost.v1.';
const memory = new Map<string, string>();
let available = true;

function probe(): boolean {
  // Even reading `localStorage` can throw (blocked site data, some private modes), so everything is inside try.
  try {
    if (typeof localStorage === 'undefined') return false;
    const k = PREFIX + '__probe';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}
available = probe();

export const store = {
  available: (): boolean => available,
  get<T>(key: string, fallback: T): T {
    try {
      const raw = available ? localStorage.getItem(PREFIX + key) : memory.get(key) ?? null;
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): void {
    const raw = JSON.stringify(value);
    memory.set(key, raw);
    if (!available) return;
    try {
      localStorage.setItem(PREFIX + key, raw);
    } catch {
      // Quota full or blocked mid-session: keep playing from memory.
      available = false;
    }
  },
  remove(key: string): void {
    memory.delete(key);
    try {
      if (available) localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
};
