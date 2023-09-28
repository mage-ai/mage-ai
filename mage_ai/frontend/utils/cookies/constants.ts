export const COOKIE_DOMAIN: string = typeof window === 'undefined' ? null : window.location.hostname;
export const COOKIE_PATH: string = '/';

export const SHARED_COOKIE_PROPERTIES: any = {
  domain: COOKIE_DOMAIN,
  path: COOKIE_PATH,
};

export const COOKIE_KEY_INITIAL_AS_PATH = 'initial_as_path';
export const COOKIE_KEY_INITIAL_PATHNAME = 'initial_pathname';
export const COOKIE_KEY_NOTIFICATION_TEMPLATE = 'notification_template';
export const COOKIE_KEY_NOTIFICATION_UUID = 'notification_uuid';
export const COOKIE_KEY_REF = 'ref';
