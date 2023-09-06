import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import BlockLayoutItem from './BlockLayoutItem';
import BlockLayoutItemType, {
  DATA_SOURCES,
  DATA_SOURCES_HUMAN_READABLE_MAPPING,
  DataSourceEnum,
} from '@interfaces/BlockLayoutItemType';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Breadcrumbs from '@components/Breadcrumbs';
import Button from '@oracle/elements/Button';
import ChartConfigurations from '@components/BlockLayout/ChartConfigurations';
import CodeEditor from '@components/CodeEditor';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import Headline from '@oracle/elements/Headline';
import PageBlockLayoutType, { ColumnType } from '@interfaces/PageBlockLayoutType';
import PipelineType from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import { ASIDE_HEADER_HEIGHT } from '@components/TripleLayout/index.style';
import { Add } from '@oracle/icons';
import { CHART_TYPES } from '@interfaces/ChartBlockType';
import { PADDING_UNITS, UNIT, UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { capitalize, cleanName, randomNameGenerator } from '@utils/string';
import { get, set } from '@storage/localStorage';
import { ignoreKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { removeAtIndex, sortByKey, sum } from '@utils/array';
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

  const [objectAttributes, setObjectAttributesState] = useState<BlockLayoutItemType>(null);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const refMenu = useRef(null);

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
  const [layout, setLayout] = useState<ColumnType[][]>(null);

  const refHeader = useRef(null);
  const windowSize = useWindowSize();

  const [selectedBlockItem, setSelectedBlockItemState] = useState<BlockLayoutItemType>(null);

  const refreshInterval = useMemo(() => selectedBlockItem?.data_source?.refresh_interval, [
    selectedBlockItem,
  ]);
  const {
    data: dataBlockLayoutItem,
    mutate: fetchBlockLayoutItem,
  } = api.block_layout_items.page_block_layouts.detail(
    selectedBlockItem && encodeURIComponent(uuid),
    selectedBlockItem && encodeURIComponent(selectedBlockItem?.uuid),
    {
      configuration_override: encodeURIComponent(JSON.stringify(objectAttributes?.configuration || '')),
      data_source_override: encodeURIComponent(JSON.stringify(objectAttributes?.data_source || '')),
    },
    {
      refreshInterval,
      revalidateOnFocus: !refreshInterval,
    },
  );

  const blockLayoutItemServer = useMemo(() => dataBlockLayoutItem?.block_layout_item, [
    dataBlockLayoutItem,
  ]);

  useEffect(() => {
    if (blockLayoutItemServer?.data?.error) {
      showError({
        response: blockLayoutItemServer?.data,
      });
    }
  }, [
    blockLayoutItemServer,
    showError,
]);

  const setObjectAttributes = useCallback((prev) => {
    fetchBlockLayoutItem();
    setObjectAttributesState(prev);
  }, [
    fetchBlockLayoutItem,
    setObjectAttributesState,
  ]);

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

  const [updateBlockLayoutItem, { isLoading: isLoadingUpdateBlockLayoutItem }] = useMutation(
    api.page_block_layouts.useUpdate(encodeURIComponent(uuid)),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            page_block_layout: {
              blocks: blocksNew,
              layout: layoutNew,
            },
          }) => {
            fetchPageBlockLayout();

            const blockItemNew =
              Object.values(blocksNew).find(({ name }) => name === objectAttributes?.name_new);

            if (blockItemNew) {
              setSelectedBlockItem(blockItemNew);
            }

            fetchBlockLayoutItem();
            setLayout(layoutNew);
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );
  const updateBlockLayoutItemCustom =
    useCallback((blockLayoutItem: BlockLayoutItem) => updateBlockLayoutItem({
      page_block_layout: {
        blocks: {
          ...pageBlockLayout?.blocks,
          [blockLayoutItem?.uuid]: ignoreKeys(blockLayoutItem, ['data']),
        },
        layout: pageBlockLayout?.layout,
      },
    }), [
      pageBlockLayout,
      updateBlockLayoutItem,
    ]);

  const saveLayout = useCallback(() => updateBlockLayoutItem({
    page_block_layout: {
      blocks: pageBlockLayout?.blocks,
      layout: layout || pageBlockLayout?.layout,
    },
  }), [
    layout,
    pageBlockLayout,
    updateBlockLayoutItem,
  ]);

  const blocks = useMemo(() => pageBlockLayout?.blocks, [pageBlockLayout]);

  const updateLayout = useCallback((rowIndex: number, columnIndex: number, column: ColumnType) => {
    const newLayout = [...layout];
    newLayout[rowIndex][columnIndex] = column;
    setLayout(newLayout);
  }, [
    layout,
    setLayout,
  ]);

  useEffect(() => {
    if (!layout && pageBlockLayout?.layout) {
      setLayout(pageBlockLayout?.layout);
    }
  }, [
    layout,
    pageBlockLayout,
    setLayout,
  ]);

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

  const removeBlockLayoutItem = useCallback((
    blockUUID: string,
    rowIndex: number,
    columnIndex: number,
  ) => {
    const newBlocks = {
      ...pageBlockLayout?.blocks,
    };
    delete newBlocks?.[blockUUID];

    let newLayout = [...pageBlockLayout?.layout];
    const row = newLayout[rowIndex] || [];
    const newRow = removeAtIndex(row, columnIndex);

    if (newRow?.length === 0) {
      newLayout = removeAtIndex(newLayout, rowIndex);
    } else {
      newLayout[rowIndex] = newRow;
    }

    updateBlockLayoutItem({
      page_block_layout: {
        blocks: newBlocks,
        layout: newLayout,
      },
    });
  }, [
    pageBlockLayout,
    updateBlockLayoutItem,
  ]);

  const rowsEl = useMemo(() => {
    const rows = [];

    layout?.forEach((columns, idx1) => {
      const row = [];

      const columnWidthTotal = sum(columns?.map(({ width }) => width || 0));

      columns.forEach((column, idx2: number) => {
        const {
          block_uuid: blockUUID,
          height,
          max_width_percentage: maxWidthPercentage,
          width,
        } = column;
        const block = blocks?.[blockUUID];

        const maxWidth = typeof maxWidthPercentage !== 'undefined' && maxWidthPercentage !== null
          ? maxWidthPercentage >= 0
            ? maxWidthPercentage / 100
            : maxWidthPercentage
          : null;
        const widthPercentage = width / columnWidthTotal;
        const widthPercentageFinal = maxWidth && widthPercentage > maxWidth
          ? maxWidth
          : widthPercentage;
        const containerWidth = containerRect?.width - SCROLLBAR_WIDTH;

        row.push(
          <Flex
            flexBasis={`${Math.floor(widthPercentageFinal * 100)}%`}
            flexDirection="column"
            key={`row-${idx1}-column-${idx2}-${blockUUID}`}
          >
            <BlockLayoutItem
              block={block}
              blockUUID={blockUUID}
              columnLayoutSettings={column}
              height={height}
              onSave={saveLayout}
              pageBlockLayoutUUID={uuid}
              removeBlockLayoutItem={() => removeBlockLayoutItem(blockUUID, idx1, idx2)}
              setSelectedBlockItem={setSelectedBlockItem}
              updateLayout={(column: ColumnType) => updateLayout(idx1, idx2, column)}
              width={Math.floor(widthPercentageFinal * containerWidth)}
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
    removeBlockLayoutItem,
    saveLayout,
    setSelectedBlockItem,
    updateLayout,
    uuid,
  ]);

  const heightAdjusted =
    useMemo(() => containerRect?.height - headerRect?.height, [
      containerRect,
      headerRect,
    ]);

  const beforeHidden = useMemo(() => !selectedBlockItem, [selectedBlockItem]);

  const { data: dataPipeline } = api.pipelines.detail(objectAttributes?.data_source?.pipeline_uuid);
  const pipeline: PipelineType = useMemo(() => dataPipeline?.pipeline, [dataPipeline]);
  const blocksFromPipeline: BlockType[] =
    useMemo(() => sortByKey(pipeline?.blocks || [], 'uuid'), [pipeline]);

  const { data: dataPipelines } = api.pipelines.list();
  const pipelines: PipelineType[] =
    useMemo(() => sortByKey(dataPipelines?.pipelines || [], 'uuid'), [dataPipelines]);

  const before = useMemo(() => (
    <div
      style={{
        paddingBottom: UNITS_BETWEEN_ITEMS_IN_SECTIONS * UNIT,
        paddingTop: ASIDE_HEADER_HEIGHT,
      }}
    >
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

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
        <ChartConfigurations
          block={{
            ...selectedBlockItem,
            ...objectAttributes,
            data: {
              ...selectedBlockItem?.data,
              ...objectAttributes?.data,
              ...blockLayoutItemServer?.data,
            },
          }}
          updateConfiguration={(configuration) => {
            setObjectAttributes(prev => ({
              ...prev,
              configuration: {
                ...prev?.configuration,
                ...configuration,
              },
            }));
          }}
        />
      </Spacing>
    </div>
  ), [
    blockLayoutItemServer,
    blocksFromPipeline,
    objectAttributes,
    pipelines,
    selectedBlockItem,
    setObjectAttributes,
  ]);

  const after = useMemo(() => selectedBlockItem && (
    <CodeEditor
      autoHeight
      // autocompleteProviders={autocompleteProviders}
      block={selectedBlockItem}
      // height={height}
      // language={selectedBlockItem}
      onChange={(val: string) => {
        setObjectAttributes(prev => ({
          ...prev,
          content: val,
        }));
      }}
      // onDidChangeCursorPosition={onDidChangeCursorPosition}
      // placeholder={BlockTypeEnum.DBT === blockType && BlockLanguageEnum.YAML === blockLanguage
      //   ? `e.g. --select ${dbtProjectName || 'project'}/models --exclude ${dbtProjectName || 'project'}/models/some_dir`
      //   : 'Start typing here...'
      // }
      // selected={selected}
      // setSelected={setSelected}
      // setTextareaFocused={setTextareaFocused}
      // shortcuts={hideRunButton
      //   ? []
      //   : [
      //     (monaco, editor) => executeCode(monaco, () => {
      //       if (!hideRunButton) {
      //         runBlockAndTrack({
      //           /*
      //           * This block doesn't get updated when the upstream dependencies change,
      //           * so we need to update the shortcuts in the CodeEditor component.
      //           */
      //           block,
      //           code: editor.getValue(),
      //         });
      //       }
      //     }),
      //   ]
      // }
      // textareaFocused={textareaFocused}
      value={objectAttributes?.content || blockLayoutItemServer?.content || ''}
      width="100%"
    />
  ), [
    blockLayoutItemServer,
    objectAttributes,
    selectedBlockItem,
    setObjectAttributes,
  ]);

  return (
    <TripleLayout
      after={after}
      afterHeightOffset={0}
      afterHidden={beforeHidden}
      afterWidth={afterWidth}
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
      hideAfterCompletely
      hideBeforeCompletely
      mainContainerRef={mainContainerRef}
      setAfterMousedownActive={setAfterMousedownActive}
      setAfterWidth={setAfterWidth}
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
              <FlyoutMenuWrapper
                items={[
                  {
                    label: () => 'Existing chart',
                    onClick: () => false,
                  },
                  {
                    label: () => 'Create new chart',
                    onClick: () => {
                      const blockItemName = randomNameGenerator();
                      const blockItem = {
                        name: blockItemName,
                        type: BlockTypeEnum.CHART,
                        uuid: cleanName(blockItemName),
                      };

                      const layoutUpdated = [...pageBlockLayout?.layout];
                      layoutUpdated.push([
                        {
                          block_uuid: blockItem.uuid,
                          width: 1,
                        },
                      ]);

                      updateBlockLayoutItem({
                        page_block_layout: {
                          blocks: {
                            ...pageBlockLayout?.blocks,
                            [blockItem.uuid]: blockItem,
                          },
                          layout: layoutUpdated,
                        },
                      });
                      setSelectedBlockItem(blockItem);
                    },
                  },
                ]}
                onClickCallback={() => setMenuVisible(false)}
                onClickOutside={() => setMenuVisible(false)}
                open={menuVisible}
                parentRef={refMenu}
                rightOffset={0}
                uuid={`BlockLayout/${uuid}`}
                zIndex={1}
              >
                <Button
                  beforeIcon={<Add size={UNIT * 2} />}
                  onClick={() => setMenuVisible(true)}
                  primary
                >
                  Add content
                </Button>
              </FlyoutMenuWrapper>
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
          blockLayoutItem={{
            ...blockLayoutItemServer,
            configuration: {
              ...blockLayoutItemServer?.configuration,
              ...objectAttributes?.configuration,
            },
            data_source: {
              ...blockLayoutItemServer?.data_source,
              ...objectAttributes?.data_source,
            },
          }}
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
