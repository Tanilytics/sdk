import { generateSessionId } from './session-id';
import { loadSession, saveSession, clearSession } from './session-storage';


export interface SessionData {
  sessionId: string;
  startedAt: number;        // Unix ms when this session began
  lastActivityAt: number;   // Unix ms of the last recorded activity
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ─────────────────────────────────────────────────────────────────────────────
// SessionManager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manages the lifecycle of a user session.
 *
 * A session is a period of continuous user activity.
 * A new session is created when:
 *   1. No session exists in sessionStorage
 *   2. The existing session has been inactive for > SESSION_TIMEOUT_MS
 *
 * Usage:
 *   const session = new SessionManager()
 *   const id = session.getSessionId()  // call before every event
 */
export class SessionManager {
  private current: SessionData;

  constructor() {
    this.current = this.loadOrCreate();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Returns the current session ID.
   *
   * Every call to this function is an implicit activity signal —
   * it updates lastActivityAt and resets the expiry clock.
   * Call this once per event, immediately before building the event.
   */
  public getSessionId(): string {
    if (this.isExpired()) {
      this.startNewSession();
    } else {
      this.recordActivity();
    }
    return this.current.sessionId;
  }

  /**
   * Returns a snapshot of the current session data.
   * The caller receives a copy — mutations do not affect session state.
   */
  public getSnapshot(): Readonly<SessionData> {
    return { ...this.current };
  }

  

  // ── Private ────────────────────────────────────────────────────────────────

  private loadOrCreate(): SessionData {
    const stored = loadSession();

    if (stored !== null) {
      // Found a stored session — check if it has expired
      if (!this.isExpired()) {
        // Still active — use it
        return stored;
      }
      // Expired — clean it up and create a new one
      clearSession();
    }

    return this.createFresh();
  }

  private createFresh(): SessionData {
    const session: SessionData = {
      sessionId: generateSessionId(),
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    saveSession(session);
    return session;
  }

  private startNewSession(): void {
    clearSession();
    this.current = this.createFresh();
  }

  private isExpired(): boolean {
    const inactiveFor = Date.now() - this.current.lastActivityAt;
    return inactiveFor > SESSION_TIMEOUT_MS;
  }

  private recordActivity(): void {
    this.current.lastActivityAt = Date.now();
    this.persist();
  }

  private persist(): void {
    saveSession(this.current);
  }
}