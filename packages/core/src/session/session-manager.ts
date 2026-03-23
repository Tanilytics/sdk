import { generateSessionId } from './session-id';
import { loadSession, saveSession, clearSession } from './session-storage';


export interface SessionData {
  sessionId: string;
  startedAt: number;        // Unix ms when this session began
  lastActivityAt: number;   // Unix ms of the last recorded activity
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes


/**
 * Manages the lifecycle of a user session.
 *
 * A new session is created when:
 *   1. No session exists in sessionStorage
 *   2. The existing session has been inactive for > SESSION_TIMEOUT_MS
 *
 */
export class SessionManager {
  private current: SessionData;

  constructor() {
    this.current = this.loadOrCreate();
  }


  public getSessionId(): string {
    if (this.isExpired()) {
      this.startNewSession();
    } else {
      this.recordActivity();
    }
    return this.current.sessionId;
  }


  public getSnapshot(): Readonly<SessionData> {
    return { ...this.current };
  }

  


  private loadOrCreate(): SessionData {
    const stored = loadSession();

    if (stored !== null) {
      if (!this.isExpired(stored)) {
        return stored;
      }
      clearSession();
    }

    return this.createFresh();
  }

  private createFresh(): SessionData {
    const dateNow = Date.now();
    const session: SessionData = {
      sessionId: generateSessionId(),
      startedAt: dateNow,
      lastActivityAt: dateNow,
    };
    saveSession(session);
    return session;
  }

  private startNewSession(): void {
    clearSession();
    this.current = this.createFresh();
  }

  private isExpired(session?: SessionData): boolean {
    const inactiveFor = Date.now() - (session?.lastActivityAt ?? this.current.lastActivityAt);
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