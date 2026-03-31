export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown';

function readUserAgent(): string {
  try {
    return typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  } catch {
    return '';
  }
}

export function getDeviceType(): DeviceType {
  const ua = readUserAgent();

  if (!ua) return 'unknown';
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) {
    return 'tablet';
  }

  if (
    /Mobi|Android|iPhone|iPod|Windows Phone|webOS|BlackBerry|IEMobile/i.test(ua)
  ) {
    return 'mobile';
  }

  return 'desktop';
}
