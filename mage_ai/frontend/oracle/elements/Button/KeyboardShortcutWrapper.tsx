import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

import EventPropertiesType, {
  EVENT_ACTION_TYPE_CLICK,
  EVENT_COMPONENT_TYPE_BUTTON,
  EVENT_SCREEN_NAME_GENERIC,
  buildEventData,
  logEventCustom,
} from '@interfaces/EventPropertiesType';
import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';
import Tracking from '@oracle/elements/Tracking';
import UserPropertiesType from '@interfaces/UserPropertiesType';
import { useKeyboardContext } from '@context/Keyboard';

export type LinkProps = {
  as?: string;
  href: string;
};

export type KeyboardShortcutSharedProps = {
  className?: string;
  disabled?: boolean;
  eventActionName?: string;
  eventComponentName?: string;
  eventProperties?: EventPropertiesType;
  eventScreenName?: string;
  keyboardShortcutValidation?: (ks: KeyboardShortcutType, index?: number) => boolean;
  linkProps?: LinkProps;
  onClick?: (e?: Event) => void;
  openNewTab?: boolean;
  ref?: any;
  requireKeyUp?: boolean;
  uuid: string;
};

export type KeyboardShortcutWrapperProps = {
  buildChildren: (opts: {
    eventProperties: EventPropertiesType;
    eventType: string;
    logEvent: any;
    onClick?: (e?: Event) => void;
    userProperties: UserPropertiesType;
  }) => any;
} & KeyboardShortcutSharedProps;

function KeyboardShortcutWrapper({
  buildChildren,
  disabled,
  eventActionName = EVENT_ACTION_TYPE_CLICK,
  eventComponentName = EVENT_COMPONENT_TYPE_BUTTON,
  eventProperties: eventPropertiesProp = {},
  eventScreenName = EVENT_SCREEN_NAME_GENERIC,
  keyboardShortcutValidation,
  linkProps,
  onClick: onClickProp,
  openNewTab,
  requireKeyUp,
  uuid,
}: KeyboardShortcutWrapperProps) {
  const router = useRouter();

  const {
    registerOnKeyDown,
    registerOnKeyUp,
    unregisterOnKeyDown,
    unregisterOnKeyUp,
  } = useKeyboardContext();
  useEffect(() => () => {
    const func = requireKeyUp ? unregisterOnKeyUp : unregisterOnKeyDown;
    func?.(uuid);
  }, [
    requireKeyUp,
    unregisterOnKeyDown,
    unregisterOnKeyUp,
    uuid,
  ]);

  let onClick;
  if (!disabled && (onClickProp || linkProps)) {
    onClick = (event) => {
      onClickProp?.(event);

      if (linkProps) {
        if (openNewTab && typeof window !== 'undefined') {
          window.open(linkProps.as || linkProps.href);
          event.preventDefault();
        } else {
          router.push(linkProps.href, linkProps.as);
        }
      }
    };
  }

  const {
    eventType,
    eventProperties,
    userProperties,
  } = buildEventData({
    actionName: eventActionName,
    actionType: EVENT_ACTION_TYPE_CLICK,
    componentName: eventComponentName,
    componentType: EVENT_COMPONENT_TYPE_BUTTON,
    properties: eventPropertiesProp,
    screenName: eventScreenName,
  });

  return (
    <Tracking
      eventProperties={eventProperties}
      userProperties={userProperties}
    >
      {({ logEvent }) => {
        if (keyboardShortcutValidation && onClick) {
          const func = requireKeyUp ? registerOnKeyUp : registerOnKeyDown;
          func(
            uuid,
            (event, keyMapping, keyHistory) => {
              if (keyboardShortcutValidation({ keyHistory, keyMapping })) {
                logEventCustom(
                  logEvent,
                  eventType,
                  {
                    eventProperties: {
                      ...eventProperties,
                      usedKeyboardShortcut: true,
                    },
                    userProperties,
                  },
                );
                onClick(event);
              }
            },
            [
              eventProperties,
              eventType,
              logEvent,
              onClick,
              userProperties,
            ],
          );
        }

        return buildChildren({
          eventProperties,
          eventType,
          logEvent,
          onClick,
          userProperties,
        });
      }}
    </Tracking>
  );
}

export default KeyboardShortcutWrapper;
