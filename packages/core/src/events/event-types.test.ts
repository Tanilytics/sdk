import { describe, expect, it } from 'vitest';

import { EventTypes } from './event-types';

describe('events/event-types', () => {
  it('contains expected canonical event type strings', () => {
    expect(EventTypes.PAGE_VIEW).toBe('page_view');
    expect(EventTypes.SCROLL_DEPTH).toBe('scroll_depth');
    expect(EventTypes.TIME_ON_PAGE).toBe('time_on_page');
    expect(EventTypes.CLICK).toBe('click');
    expect(EventTypes.FORM_SUBMIT).toBe('form_submit');
    expect(EventTypes.MEDIA_PLAY).toBe('media_play');
    expect(EventTypes.MEDIA_PAUSE).toBe('media_pause');
    expect(EventTypes.MEDIA_SEEK).toBe('media_seek');
    expect(EventTypes.MEDIA_ENDED).toBe('media_ended');
    expect(EventTypes.MEDIA_PROGRESS).toBe('media_progress');
    expect(EventTypes.MEDIA_ERROR).toBe('media_error');
    expect(EventTypes.CUSTOM).toBe('custom');
  });

  it('has unique values to prevent collisions', () => {
    const values = Object.values(EventTypes);
    const unique = new Set(values);

    expect(unique.size).toBe(values.length);
  });
});
