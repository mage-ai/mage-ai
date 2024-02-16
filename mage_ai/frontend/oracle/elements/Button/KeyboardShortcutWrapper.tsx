import { useEffect } from 'react';
import { useRouter } from 'next/router';

import EventPropertiesType, {
  buildEventData,
  EVENT_ACTION_TYPE_CLICK,
  EVENT_COMPONENT_TYPE_KS_BUTTON,
  EventParametersType,
  getDefaultEventParameters,
  logEventCustom,
} from '@interfaces/EventPropertiesType';
import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';
import { useKeyboardContext } from '@context/Keyboard';

export type LinkProps = {
  as?: string;
  href: string;
};

export type KeyboardShortcutSharedProps = {
  className?: string;
  disabled?: boolean;
  eventProperties?: EventPropertiesType;
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
    eventParameters: EventParametersType;
    eventName: string;
    onClick?: (e?: Event) => void;
  }) => any;
} & KeyboardShortcutSharedProps;

function KeyboardShortcutWrapper({
  buildChildren,
  disabled,
  eventProperties,
  keyboardShortcutValidation,
  linkProps,
  onClick: onClickProp,
  openNewTab,
  requireKeyUp,
  uuid,
}: KeyboardShortcutWrapperProps) {
  const router = useRouter();
  const query = router?.query;

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
    eventActionType = EVENT_ACTION_TYPE_CLICK,
    eventComponentType = EVENT_COMPONENT_TYPE_KS_BUTTON,
    eventParameters: eventParametersProp = {},
  } = eventProperties || {};
  const defaultEventParameters = getDefaultEventParameters(eventParametersProp, query);
  const {
    eventName,
    eventParameters,
  } = buildEventData({
    actionType: eventActionType,
    componentType: eventComponentType,
    parameters: {
      ...defaultEventParameters,
      uuid,
    },
  });

  if (keyboardShortcutValidation && onClick) {
    const func = requireKeyUp ? registerOnKeyUp : registerOnKeyDown;
    func(
      uuid,
      (event, keyMapping, keyHistory) => {
        if (keyboardShortcutValidation({ keyHistory, keyMapping })) {
          logEventCustom(
            eventName,
            {
              eventParameters: {
                ...eventParameters,
                usedKeyboardShortcut: true,
              },
            },
          );
          onClick(event);
        }
      },
      [
        eventParameters,
        eventName,
        onClick,
      ],
    );
  }

  return buildChildren({
    eventName,
    eventParameters,
    onClick,
  });
}

export default KeyboardShortcutWrapper;
