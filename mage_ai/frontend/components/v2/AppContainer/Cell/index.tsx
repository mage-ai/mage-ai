import React from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import Grid from '@mana/components/Grid';
import Section from '@mana/elements/Section';
import Tag from '@mana/components/Tag';
import Text from '@mana/elements/Text';
import { Close, Cluster, Settings , CaretRight, CaretLeft, CaretUp, CaretDown } from '@mana/icons';
import { ModeEnum } from '@mana/themes/modes';
import { Row, Col } from '@mana/components/Container';
import { createUUID } from '../utils';
import { range } from '@utils/array';
import { setThemeSettings } from '@mana/themes/utils';

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

const TXT = `I’ve found several existing blocks that can potentially be reused.
Take a look and let me know if anything works, you can also ask me to simply choose the best one.`;

function Cell({
  onAdd,
  onRemove,
  uuid,
}: CellProps, ref: React.Ref<HTMLDivElement>) {
  function addApp(rowRelative: number, columnRelative: number) {
    onAdd(
      createUUID(),
      {
        grid: {
          relative: {
            column: columnRelative,
            row: rowRelative,
            uuid,
          },
        },
      },
    );
  }

  return (
    <Grid
      justifyContent="stretch"
      justifyItems="stretch"
      ref={ref}
    >
      <Section>
        <Grid
          autoFlow="column"
          justifyContent="end"
          templateColumns="min-content"
        >
          <Grid autoFlow="column" templateColumns="min-content">
            <ButtonGroup itemsContained>
              <Button
              Icon={CaretDown}
                basic
                grouped
                onClick={() => addApp(1, 0)}
              />
              <Button
              Icon={CaretUp}
                basic
                grouped
                onClick={() => addApp(-1, 0)}
              />
              <Button
              Icon={CaretLeft}
                basic
                grouped
                onClick={() => addApp(0, -1)}
              />
              <Button
              Icon={CaretRight}
                basic
                grouped
                onClick={() => addApp(0, 1)}
              />
            </ButtonGroup>

            <ButtonGroup itemsContained>
              <Button
              Icon={Close}
              basic
              grouped
              onClick={() => onRemove(uuid)}
              small
            />
            </ButtonGroup>
          </Grid>
        </Grid>

        <Divider />

        <Row direction="column" nogutter>
          <Col xs="content">
            <Row>
              <Col>
                <Text>
                  {range((Number(new Date()) % 2) + 1).reduce((acc) => TXT + ' ' + acc, '')}
                </Text>
              </Col>
              <Col xs="content"><Tag>Block</Tag></Col>
            </Row>
            <Divider short />
            <Row>
              <Col>
                <Text monospace>
                  {range((Number(new Date()) % 2) + 1).reduce((acc) => TXT + ' ' + acc, '')}
                </Text>
              </Col>
            </Row>
          </Col>

          <Divider />

          <Col xs="content">
            <ButtonGroup>
              <Button
                Icon={Settings}
                onClick={() => setThemeSettings(({ mode }) => ({
                  mode: ModeEnum.LIGHT === mode ? ModeEnum.DARK : ModeEnum.LIGHT,
                }))}
                primary
                small
              >
                Theme
              </Button>
            </ButtonGroup>
          </Col>
        </Row>
      </Section>
    </Grid>
  );
}

export default React.forwardRef(Cell);
