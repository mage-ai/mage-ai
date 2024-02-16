import * as gtag from '@utils/gtag';
import { ScreenSizeEnum, screenSizeName } from '@styles/theme';
import { isDemo } from '@utils/environment';

export const EVENT_ACTION_TYPE_CLICK = 'click';
export const EVENT_ACTION_TYPE_IMPRESSION = 'impression';
export const EVENT_COMPONENT_TYPE_BUTTON = 'button';
export const EVENT_COMPONENT_TYPE_KS_BUTTON = 'keyboard_shortcut_button';
export const EVENT_COMPONENT_TYPE_LINK = 'link';
export const EVENT_COMPONENT_TYPE_SECTION = 'section';
export const EVENT_COMPONENT_TYPE_PAGE = 'page';

// Snake case used for EventParametersType for consistency
// with Google Analytics' event parameters.
export interface EventParametersType {
  action_type?: string;
  browser?: string;
  component_type?: string;
  href?: string;
  label?: string;
  page?: string;
  page_path?: string;
  pipeline_uuid?: string;
  screen_size?: ScreenSizeEnum;
  used_keyboard_shortcut?: boolean;
  uuid?: string;
  width?: number;
}

export default interface EventPropertiesType {
  eventActionType: string;
  eventComponentType: string;
  eventParameters: EventParametersType;
}

export function buildEventParameters(
  eventParameters: EventParametersType = {},
): EventParametersType {
  const width = eventParameters?.width || (typeof window !== 'undefined' ? window.innerWidth : null);

  return {
    ...eventParameters,
    screen_size: screenSizeName(width),
    width,
  };
}

export function buildEventName(eventComponentType, eventActionType) {
  return `${eventComponentType}_${eventActionType}`;
}

export function buildEventData({
  actionType,
  componentType,
  parameters,
}: {
  actionType: string;
  componentType: string;
  parameters?: EventParametersType;
}) {
  const eventName = buildEventName(
    componentType,
    actionType,
  );
  const eventParameters = buildEventParameters({
    action_type: actionType,
    component_type: componentType,
    ...parameters,
  });

  return {
    eventName,
    eventParameters,
  };
}

export function getGenericPageFromPathname(
  pathname: string,
  pipelineUUID: string,
) {
  return pathname.replace(pipelineUUID, '[pipeline_uuid]');
}

export function getDefaultEventParameters(
  eventParameters: EventParametersType = {},
  query: any,
) {
  const defaultEventParameters: EventParametersType = {};

  const { pipeline: pipelineUUID } = query || {};
  if (pipelineUUID) {
    defaultEventParameters.pipeline_uuid = pipelineUUID;
  }

  if (Object.keys(eventParameters).length === 0 && typeof window !== 'undefined') {
    defaultEventParameters.page_path = window.location.pathname;
    defaultEventParameters.href = window.location.href;
  }

  if (defaultEventParameters.page_path && pipelineUUID) {
    defaultEventParameters.page = getGenericPageFromPathname(
      defaultEventParameters.page_path,
      pipelineUUID,
    );
  }

  return defaultEventParameters;
}

export function logEventCustom(
  eventName: string,
  eventParameters = {},
) {
  // This method currently only logs Google Analytics events in the Mage demo app.
  if (isDemo()) {
    gtag.logGAEvent(eventName, eventParameters);
  }
}
