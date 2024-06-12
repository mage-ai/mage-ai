import React from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import Grid from '@mana/components/Grid';
import { AddAppFunctionOptionsType, AppConfigType, AppLoaderProps } from '../interfaces';
import { AppSubtypeEnum, AppTypeEnum } from '../constants';
import { Close, CaretRight, CaretLeft, CaretUp, CaretDown } from '@mana/icons';
import { Header } from './index.style';
import { randomSimpleHashGenerator } from '@utils/string';
import { mergeDeep } from '@utils/hash';

type AppContainerProps = {
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
  { app, appLoader, addApp, removeApp, uuid }: AppContainerProps,
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
    app,
    removeApp,
  });

  return (
    <Grid borders justifyContent='stretch' justifyItems='stretch' overflow='hidden' ref={ref}>
      <Grid
        autoFlow='column'
        justifyContent='stretch'
        justifyItems='stretch'
        overflow='hidden'
        style={{
          position: 'relative',
        }}
        templateColumns='1fr'
        templateRows='auto 1fr'
      >
        <Header>
          <Grid columnGap={12} templateColumns='1fr auto' templateRows='1fr'>
            <Grid autoFlow='column' columnGap={12} templateColumns='auto 1fr'>
              {toolbars?.top}
            </Grid>

            <ButtonGroup itemsContained>
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
              <Divider vertical />
              <Button Icon={Close} basic grouped onClick={() => removeApp(uuid)} small />
            </ButtonGroup>
          </Grid>
        </Header>

        {main}
      </Grid>
    </Grid>
  );
}

export default React.forwardRef(AppContainer);
