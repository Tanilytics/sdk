import type { SessionData } from './session-manager';

const SESSION_KEY = 'tanilytics_session';

export function loadSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;

    if (!isValidSessionData(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionData): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}

function isValidSessionData(data: unknown): data is SessionData {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  return (
    typeof d.sessionId === 'string' &&
    d.sessionId.length > 0 &&
    typeof d.startedAt === 'number' &&
    typeof d.lastActivityAt === 'number' &&
    typeof d.pageViewCount === 'number'
  );
}