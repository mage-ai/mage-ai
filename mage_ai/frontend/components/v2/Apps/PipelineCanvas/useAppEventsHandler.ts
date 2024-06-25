import update from 'immutability-helper';
import {
  CustomAppEvent as CustomAppEventType,
  SubscriberType,
  SubscriptionType,
} from './interfaces';
import { CustomAppEventEnum } from './enums';
import { useEffect, useRef, useState } from 'react';
import { ClientEventType } from '@mana/shared/interfaces';
import BlockType from '@interfaces/BlockType';
import { NodeItemType, NodeType } from '@components/v2/Canvas/interfaces';
import { AppConfigType } from '../interfaces';
import { DEBUG } from '../../utils/debug';
import { selectEntriesWithValues } from '@utils/hash';

export type CustomAppEvent = CustomAppEventType;
export { CustomAppEventEnum };

export function convertEvent(
  event: MouseEvent,
  opts?: {
    app?: AppConfigType;
    block?: BlockType;
    item?: NodeItemType;
    itemRef?: React.MutableRefObject<HTMLElement | HTMLDivElement>;
    node?: NodeType;
    nodes?: NodeType[];
    operation?: ClientEventType['operationType'];
  },
): ClientEventType {
  const { app, block, item, itemRef, node, nodes, operation } = opts ?? {};
  return update({ ...(event ?? {}) } as ClientEventType, {
    data: {
      $set: selectEntriesWithValues({
        app,
        block,
        item,
        node,
        nodes,
      }),
    },
    operationTarget: {
      $set: itemRef,
    },
    operationType: {
      $set: operation,
    },
  }) as ClientEventType;
}

export type SubscriptionsType = Record<string | CustomAppEventEnum, SubscriptionType['handler']>;

export default function useAppEventsHandler(
  subscriber: SubscriberType,
  subscriptionsArg?: SubscriptionsType,
): {
  convertEvent: (
    event: MouseEvent | any,
    opts?: {
      app?: AppConfigType;
      block?: BlockType;
      item?: NodeItemType;
      itemRef?: React.MutableRefObject<HTMLElement | HTMLDivElement>;
      node?: NodeType;
      nodes?: NodeType[];
      operation?: ClientEventType['operationType'];
    },
  ) => ClientEventType;
  dispatchAppEvent: (type: CustomAppEventEnum, data: CustomAppEvent['detail']) => void;
  managerRef: React.MutableRefObject<SubscriberType>;
  subscribe?: (subscriptions: SubscriptionsType) => void;
} {
  const [subscriptions, setSubscriptions] = useState<SubscriptionsType>(subscriptionsArg ?? {});
  const managerRef = useRef(subscriber);
  const subscriptionsRef = useRef<Record<string | CustomAppEventEnum, SubscriptionType['handler']>>(
    {} as any,
  );

  function dispatchAppEvent(type: CustomAppEventEnum, data: CustomAppEvent['detail']) {
    if (typeof window === 'undefined') return;

    const eventCustom = new CustomEvent(type, {
      detail: {
        manager: managerRef.current,
        ...data,
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
  }, [subscriptions]);

  return {
    convertEvent,
    dispatchAppEvent,
    managerRef,
    subscribe: setSubscriptions,
  };
}
