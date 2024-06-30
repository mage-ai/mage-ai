import update from 'immutability-helper';
import { CustomAppEvent as CustomAppEventType, SubscriberType, SubscriptionType } from './interfaces';
import { CustomAppEventEnum } from './enums';
import { useEffect, useRef } from 'react';
import { ClientEventType } from '@mana/shared/interfaces';
import BlockType from '@interfaces/BlockType';
import { NodeItemType, NodeType } from '@components/v2/Canvas/interfaces';
import { AppConfigType } from '../interfaces';
import { DEBUG } from '../../utils/debug';

export type CustomAppEvent = CustomAppEventType;
export {
  CustomAppEventEnum,
};

export function convertEvent(event: MouseEvent, opts?: {
  app?: AppConfigType;
  block?: BlockType;
  item?: NodeItemType;
  itemRef?: React.MutableRefObject<HTMLElement | HTMLDivElement>;
  node?: NodeType;
  operation?: ClientEventType['operationType'];
}): ClientEventType {
  const {
    app,
    block,
    item,
    itemRef,
    node,
    operation,
  } = opts ?? {};
  return update(event as ClientEventType, {
    data: {
      $set: {
        app,
        block,
        item,
        node,
      },
    },
    operationTarget: {
      $set: itemRef,
    },
    operationType: {
      $set: operation,
    },
  }) as ClientEventType;
}

export default function useAppEventsHandler(
  subscriber: SubscriberType,
  subscriptions?: Record<string | CustomAppEventEnum, SubscriptionType['handler']>,
): {
  convertEvent: (event: MouseEvent, opts?: {
    app?: AppConfigType;
    block?: BlockType;
    item?: NodeItemType;
    itemRef?: React.MutableRefObject<HTMLElement | HTMLDivElement>;
    node?: NodeType;
    operation?: ClientEventType['operationType'];
  }) => ClientEventType;
  dispatchAppEvent: (type: CustomAppEventEnum, data: CustomAppEvent['detail']) => void;
  managerRef: React.MutableRefObject<SubscriberType>;
} {
  const managerRef = useRef(subscriber);
  const subscriptionsRef = useRef<Record<string | CustomAppEventEnum, SubscriptionType['handler']>>({} as any);

  function dispatchAppEvent(type: CustomAppEventEnum, data: CustomAppEvent['detail']) {
    if (typeof window === 'undefined') return;

    const eventCustom = new CustomEvent(type, {
      detail: {
        ...data,
        manager: managerRef.current,
      },
    });
    DEBUG.events && console.log('dispatchEvent:', eventCustom);
    window.dispatchEvent(eventCustom);
  }

  useEffect(() => {
    Object.entries(subscriptions ?? {})?.forEach(([type, handler]) => {
      const handle = (event: CustomAppEvent) => {
        DEBUG.events && console.log('handleEvent:', event);
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
    convertEvent,
    dispatchAppEvent,
    managerRef,
  };
}
