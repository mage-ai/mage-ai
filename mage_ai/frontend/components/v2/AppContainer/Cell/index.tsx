import React from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import EditorApp from '@components/v2/Apps/Editor';
import Grid from '@mana/components/Grid';
import Section from '@mana/elements/Section';
import icons from '@mana/icons';
import { randomSimpleHashGenerator } from '@utils/string';
import { AppConfigType } from '@components/v2/Apps/interfaces';
import { AppSubtypeEnum, AppTypeEnum } from '@components/v2/Apps/constants';
import useBrowser from '@components/v2/Apps/Browser/useBrowser';
import Divider from '@mana/elements/Divider';

const { Close, CaretRight, CaretLeft, CaretUp, CaretDown } = icons;

export type AddAppFunctionOptionsType = {
  container?: HTMLElement;
  grid?: {
    absolute?: AppConfigType;
    relative?: AppConfigType;
  };
};

export type AddAppFunctionType = (app: AppConfigType, opts?: AddAppFunctionOptionsType) => void;

export type CellLayoutOperationProps = {
  onAdd?: AddAppFunctionType;
};

type CellProps = {
  app: AppConfigType;
  column?: number;
  onRemove?: (uuid: string) => void;
  row?: number;
  uuid: string;
} & CellLayoutOperationProps;

function Cell({ app, onAdd, onRemove, uuid }: CellProps, ref: React.Ref<HTMLDivElement>) {
  const { subtype, type } = app;

  function addApp(rowRelative: number, columnRelative: number) {
    onAdd(
      {
        subtype: AppSubtypeEnum.IDE,
        type: AppTypeEnum.EDITOR,
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

  const { main, toolbars } = useBrowser({ app });

  return (
    <Grid justifyContent='stretch' justifyItems='stretch' ref={ref}>
      <Section>
        <Grid
          autoFlow='column'
          justifyContent='stretch'
          justifyItems='stretch'
          templateColumns='1fr'
          templateRows='min-content 1fr'
        >
          <Grid autoFlow='column' justifyContent='space-between' templateColumns='1fr'>
            {toolbars?.top}

            <Grid autoFlow='column' justifyContent='end' templateColumns='1fr'>
              <Grid autoFlow='column' templateRows='min-content'>
                <ButtonGroup itemsContained>
                  <Button Icon={CaretDown} basic grouped onClick={() => addApp(1, 0)} small />
                  <Button Icon={CaretUp} basic grouped onClick={() => addApp(-1, 0)} small />
                  <Button Icon={CaretLeft} basic grouped onClick={() => addApp(0, -1)} small />
                  <Button Icon={CaretRight} basic grouped onClick={() => addApp(0, 1)} small />
                  <Divider vertical />
                  <Button Icon={Close} basic grouped onClick={() => onRemove(uuid)} small />
                </ButtonGroup>
              </Grid>
            </Grid>
          </Grid>

          {type === AppTypeEnum.EDITOR && subtype === AppSubtypeEnum.IDE && <EditorApp />}
          {type === AppTypeEnum.BROWSER && subtype === AppSubtypeEnum.SYSTEM && main}
        </Grid>
      </Section>
    </Grid>
  );
}

export default React.forwardRef(Cell);
