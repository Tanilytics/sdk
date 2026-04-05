// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachFormTracker, detachFormTracker } from './form';

const mockTrack = vi.fn();

beforeEach(() => {
  mockTrack.mockClear();
  document.body.innerHTML = '';
  attachFormTracker({ track: mockTrack });
});

afterEach(() => {
  detachFormTracker();
});

function submitForm(form: HTMLFormElement) {
  form.dispatchEvent(
    new SubmitEvent('submit', { bubbles: true, cancelable: true })
  );
}

describe('Form tracking', () => {
  it('tracks form submissions', () => {
    document.body.innerHTML = `
      <form id="newsletter" action="/subscribe">
        <input type="email" />
        <button type="submit">Subscribe</button>
      </form>
    `;
    submitForm(document.querySelector('form')!);

    expect(mockTrack).toHaveBeenCalledWith(
      'form_submit',
      expect.objectContaining({
        eventName: 'form_submit',
        formId: 'newsletter',
        formAction: expect.stringContaining('/subscribe'),
      })
    );
  });

  it('never tracks forms with password fields', () => {
    document.body.innerHTML = `
      <form id="login">
        <input type="text" name="username" />
        <input type="password" name="password" />
        <button type="submit">Login</button>
      </form>
    `;
    submitForm(document.querySelector('form')!);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('counts form fields without capturing values', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" />
        <input type="email" />
        <textarea></textarea>
        <button type="submit">Submit</button>
      </form>
    `;
    submitForm(document.querySelector('form')!);

    expect(mockTrack).toHaveBeenCalledWith(
      'form_submit',
      expect.objectContaining({ fieldCount: 3 })
    );
  });

  it('respects data-analytics-ignore attribute', () => {
    document.body.innerHTML = `
      <form data-analytics-ignore>
        <input type="text" />
        <button type="submit">Submit</button>
      </form>
    `;
    submitForm(document.querySelector('form')!);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('does not track after detach', () => {
    detachFormTracker();
    document.body.innerHTML = `
      <form>
        <input type="text" />
        <button type="submit">Submit</button>
      </form>
    `;
    submitForm(document.querySelector('form')!);
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
