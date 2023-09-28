import { buildUserProperties } from './UserPropertiesType';
import { getGroup, getUser } from '@utils/session';
import { getTrackingCookies } from '@utils/cookies/utils';
import { logRender } from '@utils/environment';
import { screenSizeName } from '@styles/theme';

export const EVENT_ACTION_TYPE_CLICK = 'click';
export const EVENT_ACTION_TYPE_IMPRESSION = 'impression';
export const EVENT_COMPONENT_NAME_ADD_DATA = 'add_data';
export const EVENT_COMPONENT_NAME_EXPLORE_MARKETPLACE_DATA = 'explore_marketplace_data';
export const EVENT_COMPONENT_NAME_REQUEST_ACCESS = 'request_access';
export const EVENT_COMPONENT_TYPE_BUTTON = 'button';
export const EVENT_COMPONENT_TYPE_LINK = 'link';
export const EVENT_COMPONENT_TYPE_SECTION = 'section';
export const EVENT_COMPONENT_TYPE_PAGE = 'page';
export const EVENT_SCREEN_NAME_DASHBOARD = 'dashboard';
export const EVENT_SCREEN_NAME_FORGOT = 'password_forgot';
export const EVENT_SCREEN_NAME_GENERIC = 'generic';
export const EVENT_SCREEN_NAME_HOME = 'home';
export const EVENT_SCREEN_NAME_RESET = 'password_reset';

export default interface EventPropertiesType {
  actionType?: string;
  componentType?: string;
  dataSourceName?: string;
  dataSourceType?: string;
  featureSetVersionId?: number;
  href?: string;
  initialAsPath?: string;
  initialPathname?: string;
  modelId?: number;
  modelVersionId?: number;
  modelVersionPredictionType?: string;
  modelVersionUseCase?: string;
  referringURL?: string;
  requestingURL?: string;
  secondsSinceStart?: number;
  slug?: string;
  trainingRunId?: number;
  usedKeyboardShortcut?: boolean;
  uuid?: string;
  value?: string | number;
  width?: string;
  workspace?: string;
}

export function buildEventProperties(eventProperties: EventPropertiesType = {}) {
  const trackingCookies = getTrackingCookies();
  const width = eventProperties?.width || typeof window !== 'undefined' ? window.innerWidth : null;

  return {
    ...eventProperties,
    ...trackingCookies,
    groupId: getGroup()?.id,
    partner_id: 'Mage',
    screenSize: screenSizeName(width),
    userId: getUser()?.id,
  };
}

export function buildEventType(eventScreenName, eventActionName, eventComponentName) {
  return `${eventScreenName}.${eventActionName}_${eventComponentName}`;
}

export function buildEventData({
  actionName,
  actionType,
  componentName,
  componentType,
  properties,
  screenName,
}: {
  actionName?: string;
  actionType: string;
  componentName?: string;
  componentType: string;
  properties?: EventPropertiesType;
  screenName: string;
}) {
  const eventType = buildEventType(
    screenName,
    actionName || actionType,
    componentName || componentType,
  );
  const eventProperties = buildEventProperties({
    actionType,
    componentType,
    ...properties,
  });

  return {
    eventProperties,
    eventType,
    userProperties: buildUserProperties(),
  };
}

export function logEventCustom(logEventOriginalFunction, eventType, opts = {}) {
//   logRender(`
// Tracking: ${eventType}
// ${JSON.stringify(opts, undefined, 2)}
//   `);
  logEventOriginalFunction?.(eventType);
}
