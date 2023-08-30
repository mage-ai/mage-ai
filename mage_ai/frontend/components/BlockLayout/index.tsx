import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import BlockLayoutItem from './BlockLayoutItem';
import BlockLayoutItemType, {
  DATA_SOURCES,
  DATA_SOURCES_HUMAN_READABLE_MAPPING,
  DataSourceEnum,
} from '@interfaces/BlockLayoutItemType';
import BlockType from '@interfaces/BlockType';
import Breadcrumbs from '@components/Breadcrumbs';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import PageBlockLayoutType from '@interfaces/PageBlockLayoutType';
import PipelineType from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import { Add } from '@oracle/icons';
import { ASIDE_HEADER_HEIGHT } from '@components/TripleLayout/index.style';
import { CHART_TYPES } from '@interfaces/ChartBlockType';
import { PADDING_UNITS, UNIT, UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';
import { get, set } from '@storage/localStorage';
import { ignoreKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { sortByKey, sum } from '@utils/array';
import { useError } from '@context/Error';
import { useWindowSize } from '@utils/sizes';

type BlockLayoutProps = {
  uuid: string;
};

function BlockLayout({
  uuid,
}: BlockLayoutProps) {
  const [showError] = useError(null, {}, [], {
    uuid: `BlockLayout/${uuid}`,
  });

  const [objectAttributes, setObjectAttributes] = useState<BlockLayoutItemType>(null);

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

  const [selectedBlockItem, setSelectedBlockItemState] = useState<BlockLayoutItemType>(null);
  const setSelectedBlockItem = useCallback((prev) => {
    setObjectAttributes(prev);
    setSelectedBlockItemState(prev);
  }, [
    setObjectAttributes,
    setSelectedBlockItemState,
  ]);

  const {
    data: dataPageBlockLayout,
    mutate: fetchPageBlockLayout,
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

  const [updateBlockLayoutItem, { isLoading: isLoadingUpdateBlockLayoutItem }] = useMutation(
    api.page_block_layouts.useUpdate(encodeURIComponent(uuid)),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            page_block_layout: {
              blocks: blocksNew,
            },
          }) => {
            fetchPageBlockLayout();

            const blockItemNew =
              Object.values(blocksNew).find(({ name }) => name === objectAttributes?.name_new);

            if (blockItemNew) {
              setSelectedBlockItem(blockItemNew);
            }
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );
  const updateBlockLayoutItemCustom = useCallback((blockLayoutItem: BlockLayoutItem) => {
    return updateBlockLayoutItem({
      page_block_layout: {
        blocks: {
          ...pageBlockLayout?.blocks,
          [blockLayoutItem?.uuid]: ignoreKeys(blockLayoutItem, ['data']),
        },
        layout: pageBlockLayout?.layout,
      },
    });
  }, [
    pageBlockLayout,
    updateBlockLayoutItem,
  ]);

  const { data: dataPipeline } = api.pipelines.detail(objectAttributes?.data_source?.pipeline_uuid);
  const pipeline: PipelineType = useMemo(() => dataPipeline?.pipeline, [dataPipeline]);
  const blocksFromPipeline: BlockType[] =
    useMemo(() => sortByKey(pipeline?.blocks || [], 'uuid'), [pipeline]);

  const { data: dataPipelines } = api.pipelines.list();
  const pipelines: PipelineType[] =
    useMemo(() => sortByKey(dataPipelines?.pipelines || [], 'uuid'), [dataPipelines]);

  const before = useMemo(() => (
    <div style={{ paddingTop: ASIDE_HEADER_HEIGHT }}>
      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
        <Spacing mb={1}>
          <Text bold>
            Chart name
          </Text>
          <Text muted small>
            Human readable name for your chart.
          </Text>
        </Spacing>

        <TextInput
          // @ts-ignore
          onChange={e => setObjectAttributes(prev => ({
            ...prev,
            name_new: e.target.value,
          }))}
          placeholder="Type name for chart..."
          primary
          setContentOnMount
          value={objectAttributes?.name_new || objectAttributes?.name || ''}
        />
      </Spacing>

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
        <Spacing mb={1}>
          <Text bold>
            Chart type
          </Text>
          <Text muted small>
            Choose how you want to display your data.
          </Text>
        </Spacing>

        <Select
          onChange={e => setObjectAttributes(prev => ({
            ...prev,
            configuration: {
              ...prev?.configuration,
              chart_type: e.target.value,
            },
          }))}
          placeholder="Select chart type"
          primary
          value={objectAttributes?.configuration?.chart_type || ''}
        >
          {CHART_TYPES.map(val => (
            <option key={val} value={val}>
              {capitalize(val)}
            </option>
          ))}
        </Select>
      </Spacing>

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
        <Divider light />
      </Spacing>

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
        <Headline>
          Data source
        </Headline>
      </Spacing>

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
        <Spacing mb={1}>
          <Text bold>
            Data source type
          </Text>
          <Text muted small>
            Configure where the data for this chart comes from.
          </Text>
        </Spacing>

        <Select
          onChange={e => setObjectAttributes(prev => ({
            ...prev,
            data_source: {
              ...prev?.data_source,
              type: e.target.value,
            },
          }))}
          placeholder="Select data source type"
          primary
          value={objectAttributes?.data_source?.type || ''}
        >
          {DATA_SOURCES.map(val => (
            <option key={val} value={val}>
              {capitalize(DATA_SOURCES_HUMAN_READABLE_MAPPING[val])}
            </option>
          ))}
        </Select>
      </Spacing>

      {DataSourceEnum.BLOCK === objectAttributes?.data_source?.type && (
        <>
          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            <Spacing mb={1}>
              <Text bold>
                Pipeline UUID
              </Text>
              <Text muted small>
                Select the pipeline the data source comes from.
              </Text>
            </Spacing>

            <Select
              monospace
              // @ts-ignore
              onChange={e => setObjectAttributes(prev => ({
                ...prev,
                data_source: {
                  ...prev?.data_source,
                  block_uuid: null,
                  pipeline_uuid: e.target.value,
                },
              }))}
              placeholder="Select pipeline UUID"
              primary
              value={objectAttributes?.data_source?.pipeline_uuid || ''}
            >
              {pipelines?.map(({ uuid }) => (
                <option key={uuid} value={uuid}>
                  {uuid}
                </option>
              ))}
            </Select>
          </Spacing>

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            <Spacing mb={1}>
              <Text bold>
                Block UUID
              </Text>
              <Text muted small>
                Select the block the data source comes from.
              </Text>
            </Spacing>

            <Select
              monospace
              // @ts-ignore
              onChange={e => setObjectAttributes(prev => ({
                ...prev,
                data_source: {
                  ...prev?.data_source,
                  block_uuid: e.target.value,
                },
              }))}
              placeholder="Select block UUID"
              primary
              value={objectAttributes?.data_source?.block_uuid || ''}
            >
              {blocksFromPipeline?.map(({ uuid }) => (
                <option key={uuid} value={uuid}>
                  {uuid}
                </option>
              ))}
            </Select>
          </Spacing>

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            <Spacing mb={1}>
              <Text bold>
                Partitions
              </Text>
              <Text muted small>
                Enter a positive or a negative number.
                If positive, then data from the block will be the most recent N partitions.
                If negative, then data from the block will be the oldest N partitions.
              </Text>

              <Spacing mt={1}>
                <Text muted small>
                  Leave blank if you want the chart to execute the block and display the data
                  produced from that ad hoc block execution.
                </Text>
              </Spacing>
            </Spacing>

            <TextInput
              monospace
              // @ts-ignore
              onChange={e => setObjectAttributes(prev => ({
                ...prev,
                data_source: {
                  ...prev?.data_source,
                  partitions: typeof e.target.value !== 'undefined'
                    ? Number(e.target.value)
                    : e.target.value,
                },
              }))}
              placeholder="Enter number of partitions"
              primary
              setContentOnMount
              type="number"
              value={objectAttributes?.data_source?.partitions || ''}
            />
          </Spacing>

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            <Spacing mb={1}>
              <Text bold>
                Refresh interval
              </Text>
              <Text muted small>
                How frequent do you want this chart to automatically fetch new data from its
                data source? Enter a number in milliseconds (e.g. 1000ms is 1 second).
              </Text>
            </Spacing>

            <TextInput
              monospace
              // @ts-ignore
              onChange={e => setObjectAttributes(prev => ({
                ...prev,
                data_source: {
                  ...prev?.data_source,
                  refresh_interval: e.target.value,
                },
              }))}
              placeholder="Enter number for refresh interval"
              primary
              setContentOnMount
              type="number"
              value={objectAttributes?.data_source?.refresh_interval || ''}
            />
          </Spacing>
        </>
      )}

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
        <Divider light />
      </Spacing>

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
        <Headline>
          Chart display settings
        </Headline>
      </Spacing>
    </div>
  ), [
    blocksFromPipeline,
    objectAttributes,
    pipelines,
    setObjectAttributes,
  ]);

  return (
    <TripleLayout
      before={before}
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
          {!beforeHidden && (
            <Spacing p={PADDING_UNITS}>
              <Button
                loading={isLoadingUpdateBlockLayoutItem}
                onClick={() => updateBlockLayoutItemCustom(objectAttributes)}
                primary
              >
                Save content
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
