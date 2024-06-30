import { ClientEventType } from '@mana/shared/interfaces';
import { AppStatusEnum, AppSubtypeEnum, AppTypeEnum } from '../constants';
import { AppConfigType } from '../interfaces';
import { useEffect, useRef } from 'react';
import { buildAppNode } from './AppManager/utils';
import { AppNodeType, NodeType } from '@components/v2/Canvas/interfaces';
import { CustomAppEventEnum, } from './enums';
import { AppManagerType } from './interfaces';
import useAppEventsHandler, { CustomAppEvent } from './useAppEventsHandler';
import { unique } from '@utils/array';
import { DEBUG } from '@components/v2/utils/debug';

export default function useAppManager({ activeLevel }: { activeLevel: React.MutableRefObject<number> }) {
  const appsRef = useRef<Record<string, AppNodeType[]>>({});

  const handleStartApp = (event: CustomAppEvent) => {
    startApp(event?.detail?.event, event?.detail?.app);
  };

  const handleAppRectUpdated = ({ detail: { event } }: CustomAppEvent) => {
    const { data } = event;
    const { node: appNode } = data;
    appNode?.upstream?.forEach((nodeID: string) => {
      const apps = [];
      appsRef?.current?.[nodeID]?.forEach((child) => {
        const childCopy = { ...child, rect: { ...child.rect } };
        if (appNode?.id === childCopy?.id) {
          childCopy.rect = { ...appNode.rect };
        }

        apps.push(childCopy);
      });
    });

    dispatchAppEvent(CustomAppEventEnum.APP_STARTED, {
      event,
    });
  };

  function handleStopApp({ detail: { event } }: CustomAppEvent) {
    const { data } = event as ClientEventType;
    const { app, node: appNode } = data;

    DEBUG && console.log('handleStopApp.start', appNode, appNode.upstream, appsRef.current);

    const mapping = {};
    const entries = [...Object.entries(appsRef?.current ?? {})];

    entries?.forEach(([nodeID, apps]: [string, AppNodeType[]]) => {
      apps?.forEach((child) => {
        if (child?.id === appNode?.id) {
          delete appsRef.current[nodeID];
        } else {
          mapping[nodeID] ||= [];
          mapping[nodeID].push(child);
        }
      });
    });
    appsRef.current = mapping;

    DEBUG && console.log('handleStopApp.end', appNode, appNode.upstream, appsRef.current);

    dispatchAppEvent(CustomAppEventEnum.APP_STOPPED, {
      event: convertEvent(event, {
        app,
        node: appNode,
      }),
    });
  }

  const { convertEvent, dispatchAppEvent } = useAppEventsHandler({
    appsRef,
    startApp,
  } as AppManagerType, {
    [CustomAppEventEnum.START_APP]: handleStartApp,
    [CustomAppEventEnum.STOP_APP]: handleStopApp,
    [CustomAppEventEnum.APP_RECT_UPDATED]: handleAppRectUpdated,
  });

  function startApp(event: ClientEventType, app: AppConfigType) {
    const { node } = event.data;
    appsRef.current[node.id] ||= [];

    const appNode = buildAppNode(node, app, {
      level: activeLevel?.current,
    });
    if (appNode?.app?.status === AppStatusEnum.INITIALIZED) {
      appNode.app.status = AppStatusEnum.PENDING_LAYOUT;
    }
    appsRef.current[node.id] = unique([
      ...(appsRef?.current?.[node.id] ?? []),
      appNode,
    ], ({ id }) => id);

    dispatchAppEvent(CustomAppEventEnum.APP_STARTED, {
      event,
    });
  }
}
