import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';

import DeferredRenderer from '@mana/components/DeferredRenderer';
import Item from './Item/index';
import filePaths from './mock';
import { AppConfigType } from '../../interfaces';
import { ItemDetailType } from './interfaces';
import Worker from 'worker-loader!@public/workers/worker.ts';

type SystemBrowserProps = {
  app: AppConfigType;
};

function SystemBrowser({ app }: SystemBrowserProps) {
  const themeContext = useContext(ThemeContext);
  const rootID = useMemo(() => `system-browser-items-root-${app?.uuid}`, [app]);

  const filePathsRef = useRef<string[]>(filePaths);
  const itemsRootRef = useRef(null);

  useEffect(() => {
    const createWorker = async () => {
      const worker = new Worker();

      worker.onmessage = (event: MessageEvent) => {
        if (!itemsRootRef?.current) {
          const node = document.getElementById(rootID);
          itemsRootRef.current = createRoot(node as HTMLElement);
        }

        if (itemsRootRef?.current) {
          itemsRootRef.current.render(
            <React.StrictMode>
              <DeferredRenderer idleTimeout={1}>
                <ThemeProvider theme={themeContext}>
                  {Object.values(event?.data || {}).map((item: ItemDetailType, idx: number) => (
                    <Item
                      app={app}
                      item={item as ItemDetailType} key={`${item.name}-${idx}`}
                      themeContext={themeContext}
                    />
                  ))}
                </ThemeProvider>
              </DeferredRenderer>
            </React.StrictMode>,
          );
        }
      };

      worker.postMessage(filePathsRef?.current);

      return () => worker.terminate();
    };

    createWorker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootID]);

  return (
    <div id={rootID} />
  );
}

export default SystemBrowser;
