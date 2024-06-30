import { CustomAppEvent as CustomAppEventType, ManagerType, SubscriptionType } from './interfaces';
import { CustomAppEventEnum } from './enums';
import { useEffect, useRef } from 'react';

export type CustomAppEvent = CustomAppEventType;
export {
  CustomAppEventEnum,
};

export default function useAppEventsHandler(
  manager: ManagerType,
  subscriptions?: Record<string | CustomAppEventEnum, SubscriptionType['handler']>,
): {
  dispatchAppEvent: (type: CustomAppEventEnum, data: CustomAppEvent['detail']) => void;
  managerRef: React.MutableRefObject<ManagerType>;
} {
  const managerRef = useRef(manager);
  const subscriptionsRef = useRef<Record<string | CustomAppEventEnum, SubscriptionType['handler']>>({} as any);

  function dispatchAppEvent(type: CustomAppEventEnum, data: CustomAppEvent['detail']) {
    if (typeof window === 'undefined') return;

    const eventCustom = new CustomEvent(type, {
      detail: {
        ...data,
        manager: managerRef.current,
      },
    });

    window.dispatchEvent(eventCustom);
  }

  useEffect(() => {
    Object.entries(subscriptions ?? {})?.forEach(([type, handler]) => {
      const handle = (event: CustomAppEvent) => {
        handler(event);
      };

      subscriptionsRef.current[type] = handle;
    });

    const subs = subscriptionsRef.current;
    Object.entries(subs ?? {})?.forEach(([type, handle]) => {
      if (typeof window !== 'undefined') {
        window.addEventListener(type as any, handle);
      }
    });

    return () => {
      Object.entries(subs ?? {})?.forEach(([type, handle]) => {
        if (typeof window !== 'undefined') {
          window.removeEventListener(type as any, handle);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    dispatchAppEvent,
    managerRef,
  };
}
