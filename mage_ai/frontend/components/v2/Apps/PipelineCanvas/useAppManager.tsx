import { ClientEventType } from '@mana/shared/interfaces';
import { AppSubtypeEnum, AppTypeEnum } from '../constants';
import { AppConfigType } from '../interfaces';
import { useEffect, useRef } from 'react';
import { buildAppNode } from './AppManager/utils';
import { AppNodeType, NodeType } from '@components/v2/Canvas/interfaces';
import { CustomAppEventEnum, } from './enums';
import { AppManagerType } from './interfaces';
import useAppEventsHandler, { CustomAppEvent } from './useAppEventsHandler';
import { unique } from '@utils/array';

export default function useAppManager({ activeLevel }: { activeLevel: React.MutableRefObject<number> }) {
  const appsRef = useRef<Record<string, any>>({});

  const handleStartApp = (event: CustomAppEvent) => {
    startApp(event?.detail?.event, event?.detail?.app);
  };

  const { dispatchAppEvent } = useAppEventsHandler({
    appsRef,
    startApp,
    stopApp,
  } as AppManagerType, {
    [CustomAppEventEnum.START_APP]: handleStartApp,
  });

  function startApp(event: ClientEventType, app: AppConfigType) {
    const { node } = event.data;
    appsRef.current[node.id] ||= [];

    const appNode = buildAppNode(node, app, {
      level: activeLevel?.current,
    });
    appsRef.current[node.id] = unique([
      ...(appsRef?.current?.[node.id] ?? []),
      appNode,
    ], ({ id }) => id);

    dispatchAppEvent(CustomAppEventEnum.APP_STARTED, {
      event,
    });
  }

  function stopApp(event: ClientEventType, app: AppConfigType) {
    dispatchAppEvent(CustomAppEventEnum.APP_STOPPED, {
      app,
      event,
    });
  }
}
