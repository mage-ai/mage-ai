import React from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Grid from '@mana/components/Grid';
import Section from '@mana/elements/Section';
import { Close, CaretRight, CaretLeft, CaretUp, CaretDown } from '@mana/icons';
import { randomSimpleHashGenerator } from '@utils/string';
import EditorApp from '@components/v2/Apps/Editor';

export function createUUID() {
  return `grid-item-${randomSimpleHashGenerator()}`;
}

export type CellLayoutOperationProps = {
  onAdd?: (
    uuid: string,
    opts?: {
      container?: HTMLElement;
      grid?: {
        absolute?: {
          column: number;
          row: number;
        };
        relative?: {
          column: number;
          row: number;
          uuid: string;
        };
      };
    },
  ) => void;
};

type CellProps = {
  column?: number;
  onRemove?: (uuid: string) => void;
  row?: number;
  uuid: string;
} & CellLayoutOperationProps;

function Cell({ onAdd, onRemove, uuid }: CellProps, ref: React.Ref<HTMLDivElement>) {
  function addApp(rowRelative: number, columnRelative: number) {
    onAdd(createUUID(), {
      grid: {
        relative: {
          column: columnRelative,
          row: rowRelative,
          uuid,
        },
      },
    });
  }

  return (
    <Grid justifyContent="stretch" justifyItems="stretch" ref={ref}>
      <Section>
        <Grid autoFlow="column" justifyContent="end" templateColumns="min-content">
          <Grid autoFlow="column" templateColumns="min-content">
            <ButtonGroup itemsContained>
              <Button Icon={CaretDown} basic grouped onClick={() => addApp(1, 0)} />
              <Button Icon={CaretUp} basic grouped onClick={() => addApp(-1, 0)} />
              <Button Icon={CaretLeft} basic grouped onClick={() => addApp(0, -1)} />
              <Button Icon={CaretRight} basic grouped onClick={() => addApp(0, 1)} />
            </ButtonGroup>

            <ButtonGroup itemsContained>
              <Button Icon={Close} basic grouped onClick={() => onRemove(uuid)} small />
            </ButtonGroup>
          </Grid>
        </Grid>

        <EditorApp />
      </Section>
    </Grid>
  );
}

export default React.forwardRef(Cell);
