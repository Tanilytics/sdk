import { EventTypes } from '../events/event-types';

type TrackFn = (
  eventType: string,
  properties?: Record<string, string | number | boolean | null>,
) => void;

interface FormTrackerOptions {
  track: TrackFn;
}

let _track: TrackFn | null = null;
let _onSubmit: ((e: SubmitEvent) => void) | null = null;

// Public API

export function attachFormTracker(opts: FormTrackerOptions): void {
  if (_onSubmit !== null) return; // Already attached

  _track = opts.track;
  _onSubmit = handleSubmit;

  document.addEventListener('submit', _onSubmit, { capture: true });
}

export function detachFormTracker(): void {
  if (_onSubmit !== null) {
    document.removeEventListener('submit', _onSubmit, { capture: true });
    _onSubmit = null;
  }
  _track = null;
}

// Submit handler

function handleSubmit(event: SubmitEvent): void {
  if (_track === null) return;

  const form = event.target as HTMLFormElement | null;
  if (!form) return;

  // Hard privacy rule — never track any form with a password field
  // This catches login forms, registration forms, and password change forms
  if (hasPasswordField(form)) return;

  // Never track forms explicitly opted out
  if (form.hasAttribute('data-analytics-ignore')) return;

  _track(EventTypes.FORM_SUBMIT, {
    eventName: 'form_submit',
    formId: form.id || null,
    formName: form.name || null,
    formAction: form.action || null,
    fieldCount: countFields(form),
    // Note: field values are NEVER captured — only structural metadata
  });
}

// Helpers

function hasPasswordField(form: HTMLFormElement): boolean {
  return form.querySelector('input[type="password"]') !== null;
}

function countFields(form: HTMLFormElement): number {
  // Count interactive fields — gives context about form complexity
  // without revealing any field names or values
  return form.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), ' +
      'textarea, ' +
      'select',
  ).length;
}
