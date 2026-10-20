import React from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import Grid from '@mana/components/Grid';
import Padding from '@mana/elements/Padding';
import {
  AddAppOperationType,
  AddAppFunctionOptionsType,
  AppConfigType,
  AppLoaderProps,
  OperationTypeEnum,
  OperationsType,
  PanelType,
} from '../interfaces';
import { Close, CaretRight, CaretLeft, CaretUp, CaretDown } from '@mana/icons';
import { Header } from './index.style';
import { mergeDeep } from '@utils/hash';

type AppContainerProps = {
  app: AppConfigType;
  appLoader?: (args: AppLoaderProps) => {
    main: React.ComponentType<any>;
    toolbars: Record<string, React.ComponentType<any>>;
  };
  operations?: OperationsType;
  uuid: string;
};

function AppContainer(
  { app, appLoader, operations, uuid }: AppContainerProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const addApp = operations?.[OperationTypeEnum.ADD_APP]?.effect as AddAppOperationType;
  const removeApp = operations?.[OperationTypeEnum.REMOVE_APP]?.effect;

  const {
    bottom: bottomOperations,
    left: leftOperations,
    right: rightOperations,
    top: topOperations,
  } = app?.toolbars?.top || {
    add: undefined,
    remove: undefined,
  };

  const { main, toolbars } = appLoader?.({
    app,
    operations: {
      ...operations,
      [OperationTypeEnum.ADD_APP]: {
        ...(operations?.[OperationTypeEnum.ADD_APP] || {}),
        effect: (appNew: AppConfigType, opts?: AddAppFunctionOptionsType) => {
          const options = mergeDeep(opts, {
            grid: {
              relative: {
                layout: {
                  column: 1,
                  row: 0,
                },
                uuid,
              },
            },
          });

          addApp?.(appNew, options);
        },
      },
    },
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
        <Header
          style={{
            gridTemplateColumns:
              toolbars && (app?.toolbars?.top || removeApp)
                ? '1fr auto'
                : toolbars
                  ? '1fr'
                  : app?.toolbars?.top && removeApp
                    ? 'auto'
                    : undefined,
          }}
        >
          {toolbars?.top && (
            <Grid autoFlow="column" columnGap={12} templateColumns="1fr">
              {/* @ts-ignore */}
              {toolbars?.top}
            </Grid>
          )}

          {(app?.toolbars?.top || removeApp) && (
            <Padding bottom="small" top="small">
              <ButtonGroup basic itemsContained>
                {bottomOperations?.[OperationTypeEnum.ADD_APP] && (
                  <Button
                    Icon={CaretDown}
                    basic
                    grouped
                    onClick={() =>
                      bottomOperations?.[OperationTypeEnum.ADD_APP]?.effect(null, {
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
                {topOperations?.[OperationTypeEnum.ADD_APP] && (
                  <Button
                    Icon={CaretUp}
                    basic
                    grouped
                    onClick={() =>
                      topOperations?.[OperationTypeEnum.ADD_APP]?.effect(null, {
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
                {leftOperations?.[OperationTypeEnum.ADD_APP] && (
                  <Button
                    Icon={CaretLeft}
                    basic
                    grouped
                    onClick={() =>
                      leftOperations?.[OperationTypeEnum.ADD_APP]?.effect(null, {
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
                {rightOperations?.[OperationTypeEnum.ADD_APP] && (
                  <Button
                    Icon={CaretRight}
                    basic
                    grouped
                    onClick={() =>
                      rightOperations?.[OperationTypeEnum.ADD_APP]?.effect(null, {
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

                {app?.toolbars?.top && removeApp && <Divider vertical />}

                {removeApp && (
                  <Button Icon={Close} basic grouped onClick={() => removeApp(uuid)} small />
                )}
              </ButtonGroup>
            </Padding>
          )}
        </Header>

        {main}
      </Grid>
    </Grid>
  );
}

export default React.forwardRef(AppContainer);
