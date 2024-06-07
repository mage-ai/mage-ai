import React from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Grid from '@mana/components/Grid';
import Divider from '@mana/elements/Divider';
import { Row, Col } from '@mana/components/Container';
import Section from '@mana/elements/Section';
import Tag from '@mana/components/Tag';
import Text from '@mana/elements/Text';
import { Close, Cluster, Settings , CaretRight, CaretLeft, CaretUp, CaretDown } from '@mana/icons';
import { setThemeSettings } from '@mana/themes/utils';
import { ModeEnum } from '@mana/themes/modes';
import { range } from '@utils/array';

type CellProps = {
  column?: number;
  onAdd?: (row: number, column?: number) => void;
  onRemove?: () => void;
  row?: number;
  uuid: string;
};

const TXT = `I’ve found several existing blocks that can potentially be reused.
Take a look and let me know if anything works, you can also ask me to simply choose the best one.`;

function Cell({
  column,
  onAdd,
  onRemove,
  row,
  uuid,
}: CellProps, ref: React.Ref<HTMLDivElement>) {
  return (
    <Section ref={ref}>
      <Grid
        autoFlow="column"
        justifyContent="end"
        templateColumns="min-content"
      >
        <Grid
        autoFlow="column"
        templateColumns="min-content"
      >
          <ButtonGroup itemsContained>
            <Button
            Icon={CaretDown}
            basic
            grouped
            onClick={() => onAdd}
          />
            <Button
            Icon={CaretUp}
            basic
            grouped
            onClick={() => onAdd}
          />
            <Button
            Icon={CaretLeft}
            basic
            grouped
            onClick={() => onAdd}
          />
            <Button
            Icon={CaretRight}
            basic
            grouped
            onClick={() => onAdd}
          />
          </ButtonGroup>
          <ButtonGroup itemsContained>
            <Button
            Icon={Close}
            basic
            grouped
            onClick={() => onRemove()}
            small
          />
          </ButtonGroup>
        </Grid>
      </Grid>

      <Divider />

      <Row direction="column" nogutter>
        <Col xs="content">
          <Row>
            <Col><Text>{range(row + column + 1).reduce((acc) => TXT + ' ' + acc, '')}</Text></Col>
            <Col xs="content"><Tag>Block</Tag></Col>
          </Row>
          <Divider short />
          <Row>
            <Col><Text monospace>{range(row + column + 1).reduce((acc) => TXT + ' ' + acc, '')}</Text></Col>
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

            {onAdd && (
              <Button
                Icon={Cluster}
                onClick={() => onAdd()}
                secondary
                small
              >
                Add
              </Button>
            )}
          </ButtonGroup>
        </Col>
      </Row>
    </Section>
  );
}

export default React.forwardRef(Cell);
