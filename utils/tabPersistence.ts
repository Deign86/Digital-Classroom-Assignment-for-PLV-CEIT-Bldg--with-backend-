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
