// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { attachClickTracker, detachClickTracker } from './click';

const mockTrack = vi.fn();

beforeEach(() => {
  mockTrack.mockClear();
  document.body.innerHTML = '';
  attachClickTracker({ track: mockTrack });
});

afterEach(() => {
  detachClickTracker();
});

describe('Click tracking', () => {
  it('tracks clicks on links', () => {
    document.body.innerHTML = '<a href="/about">About</a>';
    document.querySelector('a')!.click();

    expect(mockTrack).toHaveBeenCalledWith(
      'click',
      expect.objectContaining({ tag: 'a', text: 'About' }),
    );
  });

  it('tracks clicks on buttons', () => {
    document.body.innerHTML = '<button>Subscribe</button>';
    document.querySelector('button')!.click();

    expect(mockTrack).toHaveBeenCalledWith(
      'click',
      expect.objectContaining({ tag: 'button', text: 'Subscribe' }),
    );
  });

  it('walks up DOM to find parent link when icon is clicked', () => {
    document.body.innerHTML = `
      <a href="/home">
        <span class="icon">🏠</span>
      </a>
    `;
    document.querySelector('span')!.click();

    expect(mockTrack).toHaveBeenCalledWith(
      'click',
      expect.objectContaining({ tag: 'a' }),
    );
  });

  it('identifies external links correctly', () => {
    document.body.innerHTML = '<a href="https://external.com">External</a>';
    document.querySelector('a')!.click();

    expect(mockTrack).toHaveBeenCalledWith(
      'click',
      expect.objectContaining({ isExternal: true }),
    );
  });

  it('never tracks password input clicks', () => {
    document.body.innerHTML = '<input type="password" />';
    document.querySelector('input')!.click();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('never tracks clicks inside a form with a password field', () => {
    document.body.innerHTML = `
      <form>
        <input type="password" />
        <button type="submit">Login</button>
      </form>
    `;
    document.querySelector('button')!.click();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('respects data-analytics-ignore attribute', () => {
    document.body.innerHTML = `
      <button data-analytics-ignore>Do not track</button>
    `;
    document.querySelector('button')!.click();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('truncates long text to 50 characters', () => {
    const longText = 'A'.repeat(100);
    document.body.innerHTML = `<button>${longText}</button>`;
    document.querySelector('button')!.click();

    const props = mockTrack.mock.calls[0][1];
    expect(props.text.length).toBe(50);
  });

  it('does not track after detach', () => {
    detachClickTracker();
    document.body.innerHTML = '<button>Click me</button>';
    document.querySelector('button')!.click();
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
