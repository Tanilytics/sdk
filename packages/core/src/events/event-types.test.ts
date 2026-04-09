import { describe, expect, it } from 'vitest';

import { EventTypes } from './event-types';

describe('events/event-types', () => {
  it('contains expected canonical event type strings', () => {
    expect(EventTypes.PAGE_VIEW).toBe('page_view');
    expect(EventTypes.PAGE_LEAVE).toBe('page_leave');
    expect(EventTypes.CLICK).toBe('click');
    expect(EventTypes.FORM_SUBMIT).toBe('form_submit');
    expect(EventTypes.SCROLL).toBe('scroll');
    expect(EventTypes.MEDIA_PLAY).toBe('media_play');
    expect(EventTypes.MEDIA_PAUSE).toBe('media_pause');
    expect(EventTypes.MEDIA_SEEK).toBe('media_seek');
    expect(EventTypes.MEDIA_PROGRESS).toBe('media_progress');
    expect(EventTypes.MEDIA_BUFFER).toBe('media_buffer');
    expect(EventTypes.MEDIA_COMPLETE).toBe('media_complete');
  });

  it('has unique values to prevent collisions', () => {
    const values = Object.values(EventTypes);
    const unique = new Set(values);

    expect(unique.size).toBe(values.length);
  });
});
