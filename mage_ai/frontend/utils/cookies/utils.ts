import Cookies from 'js-cookie';

import {
  COOKIE_KEY_INITIAL_AS_PATH,
  COOKIE_KEY_INITIAL_PATHNAME,
  COOKIE_KEY_NOTIFICATION_TEMPLATE,
  COOKIE_KEY_NOTIFICATION_UUID,
  COOKIE_KEY_REF,
  SHARED_COOKIE_PROPERTIES,
} from './constants';

export function getTrackingCookies() {
  return [
    [COOKIE_KEY_INITIAL_AS_PATH, 'initialAsPath'],
    [COOKIE_KEY_INITIAL_PATHNAME, 'initialPathname'],
    [COOKIE_KEY_NOTIFICATION_TEMPLATE, 'notificationTemplate'],
    [COOKIE_KEY_NOTIFICATION_UUID, 'notificationUUID'],
    [COOKIE_KEY_REF, 'referringURL'],
  ].reduce((acc, [cookieKey, trackingKey]) => ({
    ...acc,
    [trackingKey]: Cookies.get(cookieKey, SHARED_COOKIE_PROPERTIES),
  }), {});
}
