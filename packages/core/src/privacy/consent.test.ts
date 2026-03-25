import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	configurePrivacy,
	giveConsent,
	isOptedOut,
	isTrackingAllowed,
	optIn,
	optOut,
	withdrawConsent,
} from './consent';

function stubLocalStorage() {
	const store = new Map<string, string>();

	const localStorageMock = {
		getItem: vi.fn((key: string) => store.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store.set(key, value);
		}),
		removeItem: vi.fn((key: string) => {
			store.delete(key);
		}),
	};

	vi.stubGlobal('localStorage', localStorageMock);

	return { store, localStorageMock };
}

describe('privacy/consent public api', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		stubLocalStorage();
		vi.stubGlobal('navigator', { doNotTrack: '0', msDoNotTrack: '0' });
		configurePrivacy({ requireConsent: false, respectDoNotTrack: true });
	});

	it('optOut and optIn toggle the persisted opt-out state', () => {
		expect(isOptedOut()).toBe(false);

		optOut();
		expect(isOptedOut()).toBe(true);
		expect(isTrackingAllowed()).toBe(false);

		optIn();
		expect(isOptedOut()).toBe(false);
	});

	it('enforces consent when requireConsent is enabled', () => {
		configurePrivacy({ requireConsent: true, respectDoNotTrack: true });
		expect(isTrackingAllowed()).toBe(false);

		giveConsent();
		expect(isTrackingAllowed()).toBe(true);
	});

	it('withdrawConsent clears consent and sets opt-out', () => {
		const { store } = stubLocalStorage();
		configurePrivacy({ requireConsent: true, respectDoNotTrack: true });

		giveConsent();
		expect(store.get('tanilytics_consent')).toBe('1');
		expect(isTrackingAllowed()).toBe(true);

		withdrawConsent();

		expect(store.has('tanilytics_consent')).toBe(false);
		expect(store.get('tanilytics_optout')).toBe('1');
		expect(isTrackingAllowed()).toBe(false);
	});

	it('surfaces write errors from withdrawConsent after clearing consent', () => {
		const { store, localStorageMock } = stubLocalStorage();
		giveConsent();
		expect(store.get('tanilytics_consent')).toBe('1');

		localStorageMock.setItem.mockImplementation(() => {
			throw new Error('blocked write');
		});

		expect(() => withdrawConsent()).toThrow(/Could not persist opt-out/);
		expect(store.has('tanilytics_consent')).toBe(false);
	});
});
