import { useEffect, useMemo, useRef, useState } from 'react';

import BlockLayoutItem from './BlockLayoutItem';
import BlockLayoutItemType from '@interfaces/BlockLayoutItemType';
import Breadcrumbs from '@components/Breadcrumbs';
import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import PageBlockLayoutType from '@interfaces/PageBlockLayoutType';
import Spacing from '@oracle/elements/Spacing';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import { Add } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { get, set } from '@storage/localStorage';
import { sum } from '@utils/array';
import { useWindowSize } from '@utils/sizes';

type BlockLayoutProps = {
  uuid: string;
};

function BlockLayout({
  uuid,
}: BlockLayoutProps) {
  const localStorageKeyAfter = `block_layout_after_width_${uuid}`;
  const localStorageKeyBefore = `block_layout_before_width_${uuid}`;

  const mainContainerRef = useRef(null);
  const [afterWidth, setAfterWidth] = useState(get(localStorageKeyAfter, 200));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeWidth, setBeforeWidth] = useState(Math.max(
    get(localStorageKeyBefore),
    UNIT * 13,
  ));
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);

  const refHeader = useRef(null);
  const windowSize = useWindowSize();

  const [selectedBlockItem, setSelectedBlockItem] = useState<BlockLayoutItemType>(null);
  const {
    data: dataPageBlockLayout,
  } = api.page_block_layouts.detail(encodeURIComponent(uuid));

  const pageBlockLayout: PageBlockLayoutType =
    useMemo(() => dataPageBlockLayout?.page_block_layout, [
      dataPageBlockLayout,
    ]);
  const blocks = useMemo(() => pageBlockLayout?.blocks, [pageBlockLayout]);
  const layout = useMemo(() => pageBlockLayout?.layout, [pageBlockLayout]);

  const [containerRect, setContainerRect] = useState(null);
  const [headerRect, setHeaderRect] = useState(null);

  useEffect(() => {
    if (mainContainerRef?.current && !(afterMousedownActive || beforeMousedownActive)) {
      setContainerRect(mainContainerRef?.current?.getBoundingClientRect());
    }
  }, [
    afterMousedownActive,
    beforeMousedownActive,
    mainContainerRef,
    selectedBlockItem,
    windowSize,
  ]);

  useEffect(() => {
    if (refHeader?.current) {
      setHeaderRect(refHeader?.current?.getBoundingClientRect());
    }
  }, [
    refHeader,
    selectedBlockItem,
    windowSize,
  ]);

  useEffect(() => {
    if (!afterMousedownActive) {
      set(localStorageKeyAfter, afterWidth);
    }
  }, [
    afterMousedownActive,
    afterWidth,
    localStorageKeyAfter,
  ]);

  useEffect(() => {
    if (!beforeMousedownActive) {
      set(localStorageKeyBefore, beforeWidth);
    }
  }, [
    beforeMousedownActive,
    beforeWidth,
    localStorageKeyBefore,
  ]);

  const rowsEl = useMemo(() => {
    const rows = [];

    layout?.forEach((columns, idx1) => {
      const row = [];

      const columnWidthTotal = sum(columns?.map(({ width }) => width || 0));

      columns.forEach(({
        block_uuid: blockUUID,
        height,
        width,
      }, idx2: number) => {
        const block = blocks?.[blockUUID];

        row.push(
          <Flex
            flex={width}
            flexDirection="column"
            key={`row-${idx1}-column-${idx2}-${blockUUID}`}
          >
            <BlockLayoutItem
              block={block}
              blockUUID={blockUUID}
              height={height}
              pageBlockLayoutUUID={uuid}
              setSelectedBlockItem={setSelectedBlockItem}
              width={(width / columnWidthTotal) * containerRect?.width}
            />
          </Flex>,
        );
      });

      rows.push(
        <FlexContainer key={`row-${idx1}`}>
          {row}
        </FlexContainer>,
      );

      rows.push(
        <Spacing
          key={`row-${idx1}-spacing`}
          mt={PADDING_UNITS}
        />,
      );
    });

    return rows;
  }, [
    blocks,
    containerRect,
    layout,
    setSelectedBlockItem,
    uuid,
  ]);

  const heightAdjusted =
    useMemo(() => containerRect?.height - headerRect?.height, [
      containerRect,
      headerRect,
    ]);

  const beforeHidden = useMemo(() => !selectedBlockItem, [selectedBlockItem]);

  return (
    <TripleLayout
      before={(
        <>
        </>
      )}
      beforeHeader={(
        <>
          <Breadcrumbs
            breadcrumbs={[
              {
                label: () => 'All content',
                onClick: () => setSelectedBlockItem(null),
              },
              {
                bold: true,
                label: () => selectedBlockItem?.name || selectedBlockItem?.uuid,
              },
            ]}
          />
        </>
      )}
      beforeHeightOffset={0}
      beforeHidden={beforeHidden}
      beforeWidth={beforeWidth}
      contained
      hideBeforeCompletely
      mainContainerRef={mainContainerRef}
      setBeforeMousedownActive={setBeforeMousedownActive}
      setBeforeWidth={setBeforeWidth}
    >
      <div ref={refHeader}>
        <FlexContainer
          justifyContent="space-between"

        >
          <Flex flex={1}>
          </Flex>

          {beforeHidden && (
            <Spacing p={PADDING_UNITS}>
              <Button
                beforeIcon={<Add size={UNIT * 2} />}
                primary
              >
                Add content
              </Button>
            </Spacing>
          )}
        </FlexContainer>
      </div>

      {selectedBlockItem && (
        <BlockLayoutItem
          block={selectedBlockItem}
          blockUUID={selectedBlockItem?.uuid}
          detail
          height={heightAdjusted}
          pageBlockLayoutUUID={uuid}
          setSelectedBlockItem={setSelectedBlockItem}
          width={containerRect?.width}
        />
      )}

      {!selectedBlockItem && rowsEl}
    </TripleLayout>
  );
}

export default BlockLayout;
