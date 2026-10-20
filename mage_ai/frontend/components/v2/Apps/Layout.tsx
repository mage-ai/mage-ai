import dynamic from 'next/dynamic';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRef, useContext, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Grid from '@mana/components/Grid';
import {
  AddAppFunctionOptionsType,
  AppConfigType,
  OperationTypeEnum,
  OperationsType,
} from './interfaces';
import { insertAtIndex, sortByKey } from '@utils/array';
import { upsertRootElement } from './utils';
import appLoader from './utils/loader';

type AppLayoutProps = {
  apps?: AppConfigType[];
  operations?: OperationsType;
};

function AppLayout({ apps: defaultApps, operations }: AppLayoutProps) {
  const queryClient = new QueryClient();
  const addPanel = operations?.[OperationTypeEnum.REMOVE_PANEL]?.effect;
  const onRemoveApp = operations?.[OperationTypeEnum.REMOVE_APP]?.effect;
  const themeContext = useContext(ThemeContext);

  const containerRef = useRef(null);

  const refAppConfigs = useRef({});
  const refCells = useRef({});
  const refRoots = useRef({});

  function updateAppConfig(app: AppConfigType) {
    refAppConfigs.current[app?.uuid] = app;
  }

  function updateLayout(app?: AppConfigType, configRelative?: AppConfigType) {
    const { uuid: uuidApp } = app || ({} as AppConfigType);
    const rowsMapping = {};

    Object.values(refAppConfigs?.current || {}).forEach((config: AppConfigType) => {
      const row = config?.layout?.row;
      if (!(row in rowsMapping)) {
        rowsMapping[row] = [];
      }
      rowsMapping[row].push(config);
    });

    if (configRelative) {
      const uuid = configRelative?.uuid;
      const config = refAppConfigs?.current?.[uuid];
      const layout = config?.layout;
      const layoutRelative = configRelative?.layout;
      const index = rowsMapping?.[layout?.row]?.findIndex((c: AppConfigType) => c.uuid === uuid);

      // Add the new app to the rows mapping relative to the parent app that added it.
      const row = layout?.row + (layoutRelative?.row || 0);
      const columnInit = index + (layoutRelative?.column || 0);
      const column = columnInit < 0 ? 0 : columnInit;

      rowsMapping[row] = rowsMapping[row] || [];
      rowsMapping[row] = insertAtIndex(
        {
          column,
          row,
          uuid: uuidApp,
        },
        column,
        rowsMapping[row],
      );
    }

    const colsMax = Math.max(
      ...Object.values(rowsMapping || {})?.map((configs: AppConfigType[]) => configs?.length || 0),
    );

    sortByKey(Object.entries(rowsMapping), ([r]: [r: number]) => r)?.forEach(
      ([_rowIdx, configs]: [number, AppConfigType[]], idxRow: number) => {
        const colsInRow = configs?.length || 0;

        sortByKey(configs, ({ layout }) => layout?.column)?.forEach(
          (config: AppConfigType, idxCol: number) => {
            const uuidCur = config?.uuid;
            const column = idxCol;
            // 3 columns max
            // 1 columns in current row
            // item 0: column 0, columnSpan 0 + (3 - 1)/(1-0) + 1 = 3; col-start: 0, col-end: 3

            // 3 columns max
            // 2 columns in current row
            // item 0: column 0, columnSpan 0 + (3 - 2)/(2-0) + 1 = 1; col-start: 0, col-end: 2
            // item 1: column 1, columnSpan 1 + (3 - 2)/(2-1) + 1 = 3; col-start: 1, col-end: 2

            // 3 columns max
            // 3 columns in current row
            // item 0: column 0, columnSpan 0 + (3 - 3)/(3-0) + 1 = 1; col-start: 0, col-end: 1
            // item 1: column 1, columnSpan 1 + (3 - 3)/(3-1) + 1 = 2; col-start: 1, col-end: 2
            // item 2: column 1, columnSpan 2 + (3 - 3)/(3-2) + 1 = 3; col-start: 2, col-end: 3
            const columnSpan = column + Math.floor((colsMax - colsInRow) / (colsInRow - idxCol));

            const configNew = {
              ...config,
              layout: {
                ...(config?.layout || {}),
                column,
                columnSpan,
                row: idxRow,
              },
              uuid: uuidCur,
            };
            updateAppConfig(configNew);
            upsertRootElement(configNew);
          },
        );
      },
    );
  }

  function addApp(app: AppConfigType, opts?: AddAppFunctionOptionsType) {
    const { subtype, type, uuid: uuidApp } = app;
    const { container, grid } = opts || {};
    updateLayout(app, grid?.relative);

    if (!(uuidApp in refAppConfigs?.current)) {
      updateAppConfig({
        ...(grid?.absolute || {}),
        layout: grid?.absolute?.layout || { column: 0, row: 0 },
        uuid: uuidApp,
      });
    }
    const config = refAppConfigs?.current?.[uuidApp];

    (container || containerRef?.current)?.appendChild(upsertRootElement(config));

    setTimeout(() => {
      const parentNode = document.getElementById(uuidApp);

      if (parentNode && !refRoots.current[uuidApp]) {
        refRoots.current[uuidApp] = createRoot(parentNode as HTMLElement);
        const ref = createRef() as React.Ref<HTMLDivElement>;
        refCells.current[uuidApp] = ref;

        const loadApp = async () => {
          const appLoaderResult = await appLoader(type, subtype);
          if (appLoaderResult) {
            const AppContainer = dynamic(() => import('./Container'));

            refRoots.current[uuidApp].render(
              <ThemeProvider theme={themeContext}>
                <QueryClientProvider client={queryClient}>
                  <AppContainer
                    app={app}
                    appLoader={appLoaderResult?.default}
                    operations={{
                      [OperationTypeEnum.ADD_APP]: {
                        effect: addApp,
                      },
                      [OperationTypeEnum.ADD_PANEL]: {
                        effect: addPanel,
                      },
                      [OperationTypeEnum.REMOVE_APP]: {
                        effect: removeApp,
                      },
                    }}
                    ref={ref}
                    uuid={uuidApp}
                  />
                </QueryClientProvider>
              </ThemeProvider>,
            );
          }
        };

        loadApp();
      }
    }, 0);
  }

  function removeApp(uuid: string) {
    if (refRoots?.current?.[uuid]) {
      refRoots.current[uuid].unmount();
      delete refRoots.current[uuid];
    }

    const parentNode = document.getElementById(uuid);
    if (parentNode) {
      parentNode?.remove();
    }

    if (refCells?.current?.[uuid]) {
      delete refCells.current[uuid];
    }

    if (refAppConfigs?.current?.[uuid]) {
      delete refAppConfigs.current[uuid];
    }

    updateLayout();

    if (onRemoveApp) {
      onRemoveApp?.(uuid, refAppConfigs?.current);
    }
  }

  useEffect(() => {
    if (containerRef?.current) {
      if (!Object.keys(refAppConfigs?.current || {})?.length) {
        if (defaultApps?.length >= 1) {
          defaultApps?.forEach((app: AppConfigType, index: number) => {
            setTimeout(() => {
              addApp(app, containerRef?.current);
            }, index * 100);
          });
        }
      }
    }

    return () => {
      // No need to manually remove all here since component is unmounting.
      refRoots.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Grid
      autoColumns='1fr'
      autoRows='1fr'
      columnGap={12}
      justifyContent='stretch'
      justifyItems='stretch'
      ref={containerRef}
      rowGap={12}
    />
  );
}

export default AppLayout;
