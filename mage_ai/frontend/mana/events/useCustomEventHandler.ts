import { CustomEvent, CustomKeyboardEvent, DetailType, EventSubscription } from './interfaces';
import { DEBUG } from '../utils/debug';
import { EventEnum } from './enums';
import { useCallback, useEffect, useRef } from 'react';

type DispatchCustomEvent = (type: EventEnum, detail?: DetailType, args?: any | any[]) => void;
type CustomEventHandlerOptions = {
  baseEvent?: typeof CustomEvent | typeof CustomKeyboardEvent;
  eventListenerTarget?: {
    addEventListener: (type: string, handler: (event: CustomEvent) => void) => void;
    removeEventListener: (type: string, handler: (event: CustomEvent) => void) => void;
  };
};

export interface CustomEventHandler {
  dispatchCustomEvent: DispatchCustomEvent;
}

export default function useCustomEventHandler(
  client: any,
  subscriptions?: EventSubscription,
  options?: CustomEventHandlerOptions,
): CustomEventHandler {
  const subscriptionsRef = useRef<EventSubscription>({});

  const dispatchCustomEvent = useCallback(
    (type: EventEnum, detail?: DetailType, args?: any | any[]) => {
      function _dispatch(type: EventEnum, detail?: DetailType, args?: any | any[]) {
        if (typeof window === 'undefined') return;

        const EventClass = options?.baseEvent ?? CustomEvent;
        const event = new EventClass(type, detail, args);

        DEBUG.events.handler && console.log('dispatchCustomEvent:', detail?.dispatcher, event);

        window.dispatchEvent(event as CustomEvent);
      }

      _dispatch(
        type,
        {
          ...detail,
          dispatcher: client,
        },
        args,
      );
    },
    [client, options],
  );

  useEffect(() => {
    Object.entries(subscriptions ?? {})?.forEach(([type, handler]) => {
      const handle = (event: CustomEvent) => {
        handler(event);
      };
      subscriptionsRef.current[type] = handle;
    });

    const subs = subscriptionsRef.current;
    const subscriber =
      options?.eventListenerTarget ?? typeof window !== 'undefined' ? window : null;

    Object.entries(subs ?? {})?.forEach(([type, handle]) => {
      subscriber?.addEventListener(type as any, handle);
    });

    return () => {
      Object.entries(subs ?? {})?.forEach(([type, handle]) => {
        subscriber?.removeEventListener(type as any, handle);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, options, subscriptions]);

  return {
    dispatchCustomEvent,
  };
}
