export const COOKIE_DOMAIN: string = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
export const COOKIE_PATH: string = process.env.NEXT_PUBLIC_COOKIE_PATH;

export const SHARED_COOKIE_PROPERTIES: any = {
  domain: COOKIE_DOMAIN,
  path: COOKIE_PATH,
};

export const COOKIE_KEY_INITIAL_AS_PATH = 'initial_as_path';
export const COOKIE_KEY_INITIAL_PATHNAME = 'initial_pathname';
export const COOKIE_KEY_NOTIFICATION_TEMPLATE = 'notification_template';
export const COOKIE_KEY_NOTIFICATION_UUID = 'notification_uuid';
export const COOKIE_KEY_REF = 'ref';
