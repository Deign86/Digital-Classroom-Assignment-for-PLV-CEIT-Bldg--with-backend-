export function storageKeyFor(role: 'admin' | 'faculty') {
  return role === 'admin' ? 'plv:adminDashboard:activeTab' : 'plv:facultyDashboard:activeTab';
}

export function readStoredTab(key: string, defaultTab: string, allowed: string[]) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return defaultTab;
    const stored = window.localStorage.getItem(key);
    if (!stored) return defaultTab;
    if (allowed.includes(stored)) return stored;
  } catch (err) {
    // ignore and return default
  }
  return defaultTab;
}

export function writeStoredTab(key: string, value: string) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch (err) {
    // ignore write failures
  }
}

/**
 * Read a named param from the URL hash (e.g. #tab=classrooms&foo=1)
 * Returns null when not present.
 */
export function readTabFromHash(param = 'tab') {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.location.hash?.replace(/^#/, '');
    if (!raw) return null;
    const params = new URLSearchParams(raw);
    return params.get(param);
  } catch (err) {
    return null;
  }
}

export function writeTabToHash(value: string | null, param = 'tab') {
  try {
    if (typeof window === 'undefined') return;
    const raw = window.location.hash?.replace(/^#/, '');
    const params = new URLSearchParams(raw);
    if (value === null) params.delete(param);
    else params.set(param, value);
    const out = params.toString();
    window.location.hash = out ? `#${out}` : '';
  } catch (err) {
    // ignore
  }
}

/**
 * Read the preferred tab value: prefer URL hash param (if allowed), else localStorage.
 */
export function readPreferredTab(key: string, defaultTab: string, allowed: string[], param = 'tab') {
  try {
    const fromHash = readTabFromHash(param);
    if (fromHash && allowed.includes(fromHash)) return fromHash;
  } catch (err) {
    // ignore
  }
  return readStoredTab(key, defaultTab, allowed);
}
