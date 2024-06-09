import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRef, useContext, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import CellItem from './Cell';
import Grid, { Cell } from '@mana/components/Grid';
import { AppConfig } from './interfaces';
import { insertAtIndex, sortByKey } from '@utils/array';
import { removeClassNames } from '@utils/elements';

import { randomSimpleHashGenerator } from '@utils/string';

export function createUUID() {
  return `grid-item-${randomSimpleHashGenerator()}`;
}

type GridContainerProps = {
  onRemoveApp: (
    uuidApp: string,
    appConfigs: {
      [uuid: string]: AppConfig;
    },
  ) => void;
};

function GridContainer({ onRemoveApp }: GridContainerProps) {
  const themeContext = useContext(ThemeContext);

  const containerRef = useRef(null);
  const refAppConfigs = useRef({});
  const refCells = useRef({});
  const refRoots = useRef({});

  function updateLayout(uuidApp?: string, configRelative?: AppConfig) {
    const rowsMapping = {};

    Object.values(refAppConfigs?.current || {}).forEach((config: AppConfig) => {
      const row = config?.row;
      if (!(row in rowsMapping)) {
        rowsMapping[row] = [];
      }
      rowsMapping[row].push(config);
    });

    if (configRelative) {
      const uuid = configRelative?.uuid;
      const config = refAppConfigs?.current?.[uuid];
      const index = rowsMapping?.[config?.row]?.findIndex((c: AppConfig) => c.uuid === uuid);

      // Add the new app to the rows mapping relative to the parent app that added it.
      const row = config?.row + (configRelative?.row || 0);
      const columnInit = index + (configRelative?.column || 0);
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
      ...Object.values(rowsMapping || {})?.map((configs: AppConfig[]) => configs?.length || 0),
    );

    sortByKey(Object.entries(rowsMapping), ([r]: [r: number]) => r)?.forEach(
      ([_rowIdx, configs]: [number, AppConfig[]], idxRow: number) => {
        const colsInRow = configs?.length || 0;

        sortByKey(configs, ({ column: columnCur }) => columnCur)?.forEach(
          (config: AppConfig, idxCol: number) => {
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
            const columnSpan =
              column + Math.floor((colsMax - colsInRow) / (colsInRow - idxCol)) + 1;

            refAppConfigs.current[uuidCur] = {
              ...config,
              column,
              columnSpan,
              row: idxRow,
            };

            const element = document.getElementById(uuidCur);
            if (element) {
              element.className = [
                'grid-cell',
                `grid-row-${idxRow}`,
                `grid-col-start-${column}`,
                `grid-col-end-${columnSpan}`,
                removeClassNames(element?.className, cn => cn.startsWith('grid-')),
              ].join(' ');
            }
          },
        );
      },
    );
  }

  function addApp(
    uuidApp: string,
    opts?: {
      container?: HTMLElement;
      grid?: {
        absolute?: AppConfig;
        relative?: AppConfig;
      };
    },
  ) {
    const { container, grid } = opts || {};
    updateLayout(uuidApp, grid?.relative);

    if (!(uuidApp in refAppConfigs?.current)) {
      refAppConfigs.current[uuidApp] = {
        ...(grid?.absolute || { column: 0, row: 0 }),
        uuid: uuidApp,
      };
    }
    const config = refAppConfigs?.current?.[uuidApp];

    (container || containerRef?.current).appendChild(Cell(config));

    setTimeout(() => {
      const parentNode = document.getElementById(uuidApp);

      if (parentNode && !refRoots.current[uuidApp]) {
        refRoots.current[uuidApp] = createRoot(parentNode as HTMLElement);
        const ref = createRef() as React.Ref<HTMLDivElement>;
        refCells.current[uuidApp] = ref;

        refRoots.current[uuidApp].render(
          <ThemeProvider theme={themeContext}>
            <CellItem onAdd={addApp} onRemove={removeApp} ref={ref} uuid={uuidApp} />
          </ThemeProvider>,
        );
      }
    }, 0);
  }

  function removeApp(uuid: string) {
    if (refRoots?.current?.[uuid]) {
      refRoots.current[uuid].unmount();
      const parentNode = document.getElementById(uuid);
      parentNode.remove();
      delete refRoots.current[uuid];
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
    if (containerRef?.current && !Object.keys(refAppConfigs?.current || {})?.length) {
      addApp(createUUID(), containerRef?.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Grid
      autoColumns="1fr"
      autoRows="1fr"
      justifyContent="stretch"
      justifyItems="stretch"
      ref={containerRef}
    />
  );
}

export default GridContainer;
