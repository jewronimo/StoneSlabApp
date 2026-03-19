export type Role = 'admin' | 'warehouse_user' | 'guest';

export type AuthSession = {
  accessToken: string;
  username: string;
  role: Role;
};

const SESSION_KEY = 'authSession';

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.username || !parsed?.role) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function authHeaders(session: AuthSession | null): Record<string, string> {
  if (!session) return {};
  return { Authorization: `Bearer ${session.accessToken}` };
}

export const isAdmin = (role?: Role | null) => role === 'admin';
export const isGuest = (role?: Role | null) => role === 'guest';
export const canEditSlabs = (role?: Role | null) => role === 'admin' || role === 'warehouse_user';
export const canDeleteSlabs = (role?: Role | null) => role === 'admin';
