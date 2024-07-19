import { DEBUG } from '../utils/debug';
import { EventEnum } from './enums';
import { CustomAppEvent } from './interfaces';
import { useCallback, useEffect, useRef } from 'react';

type DispatchCustomEvent = (type: EventEnum, detail?: any, args?: any | any[]) => void;
type CustomEventHandlerOptions = {
  baseEvent?: any;
  eventListenerTarget?: {
    addEventListener: (type: string, handler: (event: CustomAppEvent) => void) => void;
    removeEventListener: (type: string, handler: (event: CustomAppEvent) => void) => void;
  };
};

export interface CustomEventHandler {
  dispatchCustomEvent: DispatchCustomEvent;
}

export default function useCustomEventHandler(
  client: any,
  subscriptions?: Record<any, (event: CustomAppEvent) => void>,
  options?: CustomEventHandlerOptions,
): CustomEventHandler {
  const subscriptionsRef = useRef<any>({});

  const dispatchCustomEvent = useCallback(
    (type: EventEnum, detail?: any, args?: any | any[]) => {
      function _dispatch(type: EventEnum, detail?: any, args?: any | any[]) {
        if (typeof window === 'undefined') return;

        const EventClass = options?.baseEvent ?? CustomAppEvent;
        const event = new EventClass(type, detail, args);
        console.log('dispatchCustomEvent:', type, detail, args, event);

        DEBUG.events.handler && console.log('dispatchCustomEvent:', detail?.dispatcher, event);

        window.dispatchEvent(event as CustomAppEvent);
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
      const handle = (event: CustomAppEvent) => {
        handler(event);
      };
      subscriptionsRef.current[type] = handle;
    });

    const subs = subscriptionsRef.current;
    const subscriber =
      options?.eventListenerTarget ?? typeof window !== 'undefined' ? window : null;

    Object.entries(subs ?? {})?.forEach(([type, handle]) => {
      subscriber?.addEventListener(type as EventEnum, handle as any);
    });

    return () => {
      Object.entries(subs ?? {})?.forEach(([type, handle]) => {
        subscriber?.removeEventListener(type as EventEnum, handle as any);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, options, subscriptions]);

  return {
    dispatchCustomEvent,
  };
}
