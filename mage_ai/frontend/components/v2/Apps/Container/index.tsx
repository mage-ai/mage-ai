import React from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import Grid from '@mana/components/Grid';
import { AddAppFunctionOptionsType, AppConfigType } from '@components/v2/Apps/interfaces';
import { AppSubtypeEnum, AppTypeEnum } from '@components/v2/Apps/constants';
import { Close, CaretRight, CaretLeft, CaretUp, CaretDown } from '@mana/icons';
import { Header } from './index.style';
import { randomSimpleHashGenerator } from '@utils/string';

type AppContainerProps = {
  app: AppConfigType;
  appLoader?: (app: AppConfigType) => {
    main: React.ComponentType<any>;
    toolbars: Record<string, React.ComponentType<any>>;
  };
  onAdd?: (app: AppConfigType, opts?: AddAppFunctionOptionsType) => void;
  onRemove?: (uuid: string) => void;
  uuid: string;
};

function AppContainer(
  { app, appLoader, onAdd, onRemove, uuid }: AppContainerProps,
  ref: React.Ref<HTMLDivElement>,
) {
  const { subtype, type } = app;

  function addApp(rowRelative: number, columnRelative: number) {
    onAdd(
      {
        subtype,
        type,
        uuid: randomSimpleHashGenerator(),
      },
      {
        grid: {
          relative: {
            layout: {
              column: columnRelative,
              row: rowRelative,
            },
            uuid,
          },
        },
      },
    );
  }

  const { main, toolbars } = appLoader?.(app);

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
        templateRows='1fr'
      >
        <Header>
          <Grid autoFlow='column' columnGap={12} templateColumns='auto 1fr'>
            {toolbars?.top}
          </Grid>

          <ButtonGroup itemsContained>
            <Button Icon={CaretDown} basic grouped onClick={() => addApp(1, 0)} small />
            <Button Icon={CaretUp} basic grouped onClick={() => addApp(-1, 0)} small />
            <Button Icon={CaretLeft} basic grouped onClick={() => addApp(0, -1)} small />
            <Button Icon={CaretRight} basic grouped onClick={() => addApp(0, 1)} small />
            <Divider vertical />
            <Button Icon={Close} basic grouped onClick={() => onRemove(uuid)} small />
          </ButtonGroup>
        </Header>

        {main}
      </Grid>
    </Grid>
  );
}

export default React.forwardRef(AppContainer);
