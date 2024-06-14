import React from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import Grid from '@mana/components/Grid';
import Padding from '@mana/elements/Padding';
import { AddAppFunctionOptionsType, AppConfigType, AppLoaderProps, PanelType } from '../interfaces';
import { Close, CaretRight, CaretLeft, CaretUp, CaretDown } from '@mana/icons';
import { Header } from './index.style';
import { mergeDeep } from '@utils/hash';

type AppContainerProps = {
  addBottom?: () => void;
  addLeft?: () => void;
  addPanel: (panel: PanelType) => void;
  addRight?: () => void;
  addTop?: () => void;
  app: AppConfigType;
  appLoader?: (args: AppLoaderProps) => {
    main: React.ComponentType<any>;
    toolbars: Record<string, React.ComponentType<any>>;
  };
  addApp?: (app: AppConfigType, opts?: AddAppFunctionOptionsType) => void;
  removeApp?: (uuid: string) => void;
  uuid: string;
};

function AppContainer(
  {
    addApp,
    addBottom,
    addLeft,
    addPanel,
    addRight,
    addTop,
    app,
    appLoader,
    removeApp,
    uuid,
  }: AppContainerProps,
  ref: React.Ref<HTMLDivElement>,
) {
  function startApp(appNew: AppConfigType, opts?: AddAppFunctionOptionsType) {
    addApp(appNew, opts);
  }

  const { main, toolbars } = appLoader?.({
    addApp: (appNew, opts) => {
      addApp(
        appNew,
        mergeDeep(opts, {
          grid: {
            relative: {
              layout: {
                column: 1,
                row: 0,
              },
              uuid,
            },
          },
        }),
      );
    },
    addPanel,
    app,
    removeApp,
  });

  return (
    <Grid borders justifyContent="stretch" justifyItems="stretch" overflow="hidden" ref={ref}>
      <Grid
        autoFlow="column"
        justifyContent="stretch"
        justifyItems="stretch"
        overflow="hidden"
        style={{
          position: 'relative',
        }}
        templateColumns="1fr"
        templateRows="auto 1fr"
      >
        <Header>
          <Grid autoFlow="column" columnGap={12} templateColumns="1fr">
            {toolbars?.top}
          </Grid>

          <Padding bottom="small" right="small" top="small">
            <ButtonGroup basic itemsContained>
              {addBottom && (
              <Button
                Icon={CaretDown}
                basic
                grouped
                onClick={() =>
                  startApp(null, {
                    grid: {
                      relative: {
                        layout: {
                          column: 0,
                          row: 1,
                        },
                        uuid,
                      },
                    },
                  })
                }
                small
              />
            )}
              {addTop && (
              <Button
                Icon={CaretUp}
                basic
                grouped
                onClick={() =>
                  startApp(null, {
                    grid: {
                      relative: {
                        layout: {
                          column: 0,
                          row: -1,
                        },
                        uuid,
                      },
                    },
                  })
                }
                small
              />
            )}
              {addLeft && (
              <Button
                Icon={CaretLeft}
                basic
                grouped
                onClick={() =>
                  startApp(null, {
                    grid: {
                      relative: {
                        layout: {
                          column: 1,
                          row: 0,
                        },
                        uuid,
                      },
                    },
                  })
                }
                small
              />
            )}
              {addRight && (
              <Button
                Icon={CaretRight}
                basic
                grouped
                onClick={() =>
                  startApp(null, {
                    grid: {
                      relative: {
                        layout: {
                          column: 1,
                          row: 0,
                        },
                        uuid,
                      },
                    },
                  })
                }
                small
              />
            )}
              {(addLeft || addRight || addTop || addBottom) && <Divider vertical />}
              <Button Icon={Close} basic grouped onClick={() => removeApp(uuid)} small />
            </ButtonGroup>
          </Padding>
        </Header>

        {main}
      </Grid>
    </Grid>
  );
}

export default React.forwardRef(AppContainer);
