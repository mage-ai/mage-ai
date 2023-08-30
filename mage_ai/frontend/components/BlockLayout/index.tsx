import { useMemo } from 'react';

import BlockLayoutItem from './BlockLayoutItem';
import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import PageBlockLayoutType from '@interfaces/PageBlockLayoutType';
import Spacing from '@oracle/elements/Spacing';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import { Add } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

type BlockLayoutProps = {
  uuid: string;
};

function BlockLayout({
  uuid,
}: BlockLayoutProps) {
  const {
    data: dataPageBlockLayout,
  } = api.page_block_layouts.detail(encodeURIComponent(uuid));

  const pageBlockLayout: PageBlockLayoutType =
    useMemo(() => dataPageBlockLayout?.page_block_layout, [
      dataPageBlockLayout,
    ]);
  const blocks = useMemo(() => pageBlockLayout?.blocks, [pageBlockLayout]);
  const layout = useMemo(() => pageBlockLayout?.layout, [pageBlockLayout]);

  const rowsEl = useMemo(() => {
    const rows = [];

    layout?.forEach((columns, idx1) => {
      const row = [];

      columns.forEach(({
        block_uuid: blockUUID,
        height,
        width,
      }, idx2: number) => {
        const block = blocks?.[blockUUID];

        row.push(
          <BlockLayoutItem
            block={block}
            key={`row-${idx1}-column-${idx2}-${blockUUID}`}
            pageBlockLayoutUUID={uuid}
          />,
        );
      });

      rows.push(
        <div key={`row-${idx1}`}>
          {rows}
        </div>,
      );
    });

    return rows;
  }, [
    blocks,
    layout,
    uuid,
  ]);

  return (
    <TripleLayout
      mainContainerHeader={(
        <FlexContainer justifyContent="space-between">
          <Flex flex={1}>
          </Flex>

          <Spacing p={PADDING_UNITS}>
            <Button
              beforeIcon={<Add size={UNIT * 2} />}
              primary
            >
              Add content
            </Button>
          </Spacing>
        </FlexContainer>
      )}
    >
      {rowsEl}
    </TripleLayout>
  );
}

export default BlockLayout;
