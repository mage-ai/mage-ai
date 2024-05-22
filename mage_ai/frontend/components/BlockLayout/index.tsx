import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useMutation } from 'react-query';

import api from '@api';
import { onSuccess } from '@api/utils/response';
import ChartConfigurations from '@components/BlockLayout/ChartConfigurations';
import Breadcrumbs from '@components/Breadcrumbs';
import CodeEditor from '@components/CodeEditor';
import TripleLayout from '@components/TripleLayout';
import { ASIDE_HEADER_HEIGHT } from '@components/TripleLayout/index.style';
import { useError } from '@context/Error';
import BlockLayoutItemType, {
  DATA_SOURCES,
  DATA_SOURCES_HUMAN_READABLE_MAPPING,
  DataSourceEnum,
} from '@interfaces/BlockLayoutItemType';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { CHART_TYPES, ChartTypeEnum } from '@interfaces/ChartBlockType';
import PageBlockLayoutType, { ColumnType } from '@interfaces/PageBlockLayoutType';
import PipelineType from '@interfaces/PipelineType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Loading from '@oracle/components/Loading';
import Spinner from '@oracle/components/Spinner';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Headline from '@oracle/elements/Headline';
import Select from '@oracle/elements/Inputs/Select';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Add } from '@oracle/icons';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { get, set } from '@storage/localStorage';
import { pushAtIndex, removeAtIndex, sortByKey, sum } from '@utils/array';
import { ignoreKeys } from '@utils/hash';
import useDebounce from '@utils/hooks/useDebounce';
import { useWindowSize } from '@utils/sizes';
import { capitalize, cleanName, randomNameGenerator } from '@utils/string';
import BlockLayoutItem from './BlockLayoutItem';
import LayoutDivider from './LayoutDivider';

type BlockLayoutProps = {
  leftOffset?: number;
  pageBlockLayoutTemplate?: PageBlockLayoutType;
  topOffset?: number;
  uuid: string;
};

function BlockLayout({ leftOffset, pageBlockLayoutTemplate, topOffset, uuid }: BlockLayoutProps) {
  const [showError] = useError(null, {}, [], {
    uuid: `BlockLayout/${uuid}`,
  });

  const [debouncer] = useDebounce();
  const [touchedAttributes, setTouchedAttributes] = useState<{
    [attribute: string]: boolean;
  }>({});
  const [objectAttributes, setObjectAttributesState] = useState<
    {
      content?: string;
      name_new?: string;
    } & BlockLayoutItemType
  >(null);
  const [items, setItems] = useState<{
    [key: string]: BlockLayoutItemType;
  }>({});
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  const localStorageKeyAfter = `block_layout_after_width_${uuid}`;
  const localStorageKeyBefore = `block_layout_before_width_${uuid}`;

  const mainContainerRef = useRef(null);
  const [afterWidth, setAfterWidth] = useState(get(localStorageKeyAfter, UNIT * 40));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeWidth, setBeforeWidth] = useState(Math.max(get(localStorageKeyBefore), UNIT * 50));
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);

  const refHeader = useRef(null);
  const windowSize = useWindowSize();

  const [selectedBlockItem, setSelectedBlockItemState] = useState<BlockLayoutItemType>(null);
  const [deletingBlockUUID, setDeletingBlockUUID] = useState<string>(null);

  const refreshInterval = useMemo(
    () => selectedBlockItem?.data_source?.refresh_interval,
    [selectedBlockItem],
  );

  const itemCached = useMemo(() => items?.[selectedBlockItem?.uuid], [items, selectedBlockItem]);

  const [dataBlockLayoutItem, setDataBlockLayoutItem] = useState<any>(null);
  const [fetchBlockLayoutItem, { isLoading: isLoadingFetchBlockLayoutItem }]: any = useMutation(
    (
      opts: {
        skip_render?: boolean;
      } = {},
    ) =>
      api.block_layout_items.page_block_layouts.detailAsync(
        selectedBlockItem && encodeURIComponent(uuid),
        selectedBlockItem && encodeURIComponent(selectedBlockItem?.uuid),
        {
          configuration_override: encodeURIComponent(
            JSON.stringify(objectAttributes?.configuration || ''),
          ),
          content_override: encodeURIComponent(
            objectAttributes?.content || itemCached?.content || '',
          ),
          data_source_override: encodeURIComponent(
            JSON.stringify(objectAttributes?.data_source || ''),
          ),
          skip_render: opts?.skip_render ? true : false,
        },
        {
          refreshInterval,
          revalidateOnFocus: !refreshInterval,
        },
      ),
    {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: resp =>
            setDataBlockLayoutItem(prev => {
              const item = resp?.block_layout_item;

              if (prev?.block_layout_item?.uuid !== item?.uuid) {
                setObjectAttributesState(prev2 => ({
                  ...prev2,
                  ...item,
                }));
              }

              setItems(prev => ({
                ...prev,
                [item?.uuid]: item,
              }));

              return resp;
            }),
        }),
    },
  );

  const blockLayoutItemServer = useMemo(
    () => dataBlockLayoutItem?.block_layout_item,
    [dataBlockLayoutItem],
  );

  useEffect(() => {
    if (blockLayoutItemServer?.data?.error) {
      showError({
        response: blockLayoutItemServer?.data,
      });
    }
  }, [blockLayoutItemServer, showError]);

  const setObjectAttributes = useCallback(
    (prev, opts: { skip_render?: boolean } = {}) => {
      debouncer(
        () =>
          fetchBlockLayoutItem({
            skip_render: false,
          }),
        opts?.skip_render ? 3000 : 1000,
      );

      setObjectAttributesState(
        typeof prev === 'function'
          ? prev
          : prev2 => ({
              ...prev2,
              ...prev,
            }),
      );
    },
    [fetchBlockLayoutItem, debouncer, setObjectAttributesState],
  );

  const setSelectedBlockItem = useCallback(
    prev => {
      setObjectAttributes({
        ...prev,
        name_new: prev?.name_new || prev?.name || randomNameGenerator(),
      });
      setSelectedBlockItemState(prev);
    },
    [setObjectAttributes, setSelectedBlockItemState],
  );

  const [dataPageBlockLayout, setDataPageBlockLayout] = useState<any>(null);
  const pageBlockLayout = useMemo(
    () => dataPageBlockLayout?.page_block_layout,
    [dataPageBlockLayout],
  );
  const [fetchPageBlockLayout] = useMutation(
    () => api.page_block_layouts.detailAsync(encodeURIComponent(uuid)),
    {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: resp => {
            setDataPageBlockLayout(resp);
          },
        }),
    },
  );

  useEffect(() => {
    fetchPageBlockLayout();
  }, [fetchPageBlockLayout]);

  const layout: ColumnType[][] = useMemo(() => pageBlockLayout?.layout, [pageBlockLayout]);
  function setLayout(layoutNew) {
    setDataPageBlockLayout(prev => ({
      ...prev,
      page_block_layout: {
        ...prev?.page_block_layout,
        layout: layoutNew,
      },
    }));
  }

  const [updateBlockLayoutItem, { isLoading: isLoadingUpdateBlockLayoutItem }] = useMutation(
    (updatePayload: {
      page_block_layout: {
        blocks?: any;
        layout?: any;
      };
    }) => api.page_block_layouts.useUpdate(encodeURIComponent(uuid))(updatePayload),
    {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: resp => {
            const pbl = resp?.page_block_layout;
            const { blocks: blocksNew } = pbl;

            setDataPageBlockLayout(resp);

            const blockItemNew = Object.values(blocksNew).find(
              ({ name }) => name === objectAttributes?.name_new,
            );

            if (blockItemNew) {
              setSelectedBlockItem(blockItemNew);
            }

            setDeletingBlockUUID(null);
          },
          onErrorCallback: (response, errors) =>
            showError({
              errors,
              response,
            }),
        }),
    },
  );
  const updateBlockLayoutItemCustom =
    // @ts-ignore
    useCallback(
      (blockLayoutItem: BlockLayoutItemType) =>
        updateBlockLayoutItem({
          page_block_layout: {
            blocks: {
              ...pageBlockLayout?.blocks,
              [blockLayoutItem?.uuid]: ignoreKeys(blockLayoutItem, ['data']),
            },
            layout: pageBlockLayout?.layout,
          },
        }),
      [pageBlockLayout, updateBlockLayoutItem],
    );

  // @ts-ignore
  const saveLayout = useCallback(
    () =>
      updateBlockLayoutItem({
        page_block_layout: {
          blocks: pageBlockLayout?.blocks,
          layout: pageBlockLayout?.layout,
        },
      }),
    [pageBlockLayout, updateBlockLayoutItem],
  );

  const blocks = useMemo(() => pageBlockLayout?.blocks, [pageBlockLayout]);

  const updateLayout = useCallback(
    (rowIndex: number, columnIndex: number, column: ColumnType) => {
      const newLayout = [...layout];
      newLayout[rowIndex][columnIndex] = column;
      setLayout(newLayout);
    },
    [layout],
  );

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
  }, [refHeader, selectedBlockItem, windowSize]);

  useEffect(() => {
    if (!afterMousedownActive) {
      set(localStorageKeyAfter, afterWidth);
    }
  }, [afterMousedownActive, afterWidth, localStorageKeyAfter]);

  useEffect(() => {
    if (!beforeMousedownActive) {
      set(localStorageKeyBefore, beforeWidth);
    }
  }, [beforeMousedownActive, beforeWidth, localStorageKeyBefore]);

  const removeBlockLayoutItem = useCallback(
    (blockUUID: string, rowIndex: number, columnIndex: number) => {
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

      setDeletingBlockUUID(blockUUID);

      // @ts-ignore
      updateBlockLayoutItem({
        page_block_layout: {
          blocks: newBlocks,
          layout: newLayout,
        },
      });
    },
    [pageBlockLayout, updateBlockLayoutItem],
  );

  const moveBlockLayoutItem = useCallback(
    (rowIndex: number, columnIndex: number, rowIndexNew: number, columnIndexNew: number) => {
      let newLayout = [...(layout || [])];
      const row = newLayout[rowIndex] || [];
      const column = row[columnIndex];

      // Same row
      if (rowIndex === rowIndexNew && columnIndex !== columnIndexNew) {
        const rowUpdated = removeAtIndex(row, columnIndex);
        newLayout[rowIndex] = pushAtIndex(
          column,
          columnIndexNew > columnIndex ? columnIndexNew : columnIndexNew - 1,
          rowUpdated,
        );
      } else {
        const rowOld = removeAtIndex(row, columnIndex);
        newLayout[rowIndex] = rowOld;

        const rowUpdated = pushAtIndex(column, columnIndexNew, newLayout[rowIndexNew]);
        newLayout[rowIndexNew] = rowUpdated;

        // Remove row
        if (rowOld?.length === 0) {
          newLayout = removeAtIndex(newLayout, rowIndex);
        }
      }

      if (rowIndex !== rowIndexNew || columnIndex !== columnIndexNew) {
        // @ts-ignore
        updateBlockLayoutItem({
          page_block_layout: {
            blocks: pageBlockLayout?.blocks,
            layout: newLayout,
          },
        });
      }
    },
    [layout, pageBlockLayout, updateBlockLayoutItem],
  );

  const createNewBlockItem = useCallback(
    (opts?: { columnIndex?: number; rowIndex?: number; rowIndexInsert?: number }) => {
      const blockItemName = randomNameGenerator();
      const blockItem = {
        name: blockItemName,
        type: BlockTypeEnum.CHART,
        uuid: cleanName(blockItemName),
      };

      let layoutUpdated = [...(layout || [])];
      const layoutItem = {
        block_uuid: blockItem.uuid,
        width: 1,
      };

      if (opts) {
        const { columnIndex = 0, rowIndex, rowIndexInsert } = opts || {};

        if (typeof rowIndexInsert !== 'undefined') {
          layoutUpdated = pushAtIndex([layoutItem], rowIndexInsert, layoutUpdated);
        } else {
          layoutUpdated[rowIndex] = pushAtIndex(layoutItem, columnIndex, layoutUpdated[rowIndex]);
        }
      } else {
        layoutUpdated.push([layoutItem]);
      }

      // @ts-ignore
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
      setObjectAttributes(() => ({}));
    },
    [layout, pageBlockLayout, setSelectedBlockItem, setObjectAttributes, updateBlockLayoutItem],
  );

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

        const maxWidth =
          typeof maxWidthPercentage !== 'undefined' && maxWidthPercentage !== null
            ? maxWidthPercentage >= 0
              ? maxWidthPercentage / 100
              : maxWidthPercentage
            : null;
        const widthPercentage = width / columnWidthTotal;
        const widthPercentageFinal =
          maxWidth && widthPercentage > maxWidth ? maxWidth : widthPercentage;
        const containerWidth = containerRect?.width - SCROLLBAR_WIDTH;

        row.push(
          <Flex
            flexBasis={`${Math.floor(widthPercentageFinal * 100)}%`}
            key={`row-${idx1}-column-${idx2}-${blockUUID}`}
          >
            <BlockLayoutItem
              block={block}
              blockLayoutItem={items?.[blockUUID]}
              blockUUID={blockUUID}
              columnIndex={idx2}
              columnLayoutSettings={column}
              columnsInRow={columns?.length}
              createNewBlockItem={createNewBlockItem}
              first={0 === idx2}
              height={height}
              isLoading={deletingBlockUUID === blockUUID && isLoadingUpdateBlockLayoutItem}
              onDrop={({ columnIndex, rowIndex }) => {
                moveBlockLayoutItem(rowIndex, columnIndex, idx1, idx2);
              }}
              onFetchBlockLayoutItem={blockItem =>
                setItems(prev => ({
                  ...prev,
                  [blockItem?.uuid]: blockItem,
                }))
              }
              onSave={saveLayout}
              pageBlockLayoutUUID={uuid}
              removeBlockLayoutItem={() => removeBlockLayoutItem(blockUUID, idx1, idx2)}
              rowIndex={idx1}
              setSelectedBlockItem={setSelectedBlockItem}
              updateLayout={(column: ColumnType) => updateLayout(idx1, idx2, column)}
              width={Math.floor(widthPercentageFinal * containerWidth)}
            />
          </Flex>,
        );
      });

      if (idx1 === 0) {
        rows.push(
          <LayoutDivider
            horizontal
            key={`layout-divider-${idx1}-top`}
            onClickAdd={() =>
              createNewBlockItem({
                rowIndexInsert: idx1,
              })
            }
          />,
        );
      }

      rows.push(<FlexContainer key={`row-${idx1}`}>{row}</FlexContainer>);

      rows.push(
        <LayoutDivider
          horizontal
          key={`layout-divider-${idx1}-bottom`}
          onClickAdd={() =>
            createNewBlockItem({
              rowIndexInsert: idx1 + 1,
            })
          }
        />,
      );
    });

    return rows;
  }, [
    blocks,
    containerRect,
    createNewBlockItem,
    deletingBlockUUID,
    isLoadingUpdateBlockLayoutItem,
    items,
    layout,
    moveBlockLayoutItem,
    removeBlockLayoutItem,
    saveLayout,
    setSelectedBlockItem,
    updateLayout,
    uuid,
  ]);

  const isEmpty = useMemo(
    () => dataPageBlockLayout && layout?.length === 0,
    [dataPageBlockLayout, layout],
  );

  const emtpyState = useMemo(
    () => (
      <FlexContainer justifyContent="center">
        <Spacing my={3 * UNITS_BETWEEN_SECTIONS} px={PADDING_UNITS}>
          <Spacing mb={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
            <Spacing mb={1}>
              <Headline center>Create a custom dashboard</Headline>
            </Spacing>

            <Text center default>
              Add customizable charts with the exact insights you need.
            </Text>

            {pageBlockLayoutTemplate && (
              <Text center default>
                Start with a recommended set or freely define your own.
              </Text>
            )}
          </Spacing>

          <FlexContainer alignContent="center" justifyContent="center">
            {pageBlockLayoutTemplate && (
              <>
                <Button
                  // @ts-ignore
                  onClick={() =>
                    updateBlockLayoutItem({
                      page_block_layout: pageBlockLayoutTemplate,
                    })
                  }
                  primary
                >
                  Add recommended charts
                </Button>

                <Spacing mr={1} />
              </>
            )}

            <Button
              onClick={() => createNewBlockItem()}
              primary={!pageBlockLayoutTemplate}
              secondary={!!pageBlockLayoutTemplate}
            >
              Create new chart
            </Button>
          </FlexContainer>
        </Spacing>
      </FlexContainer>
    ),
    [createNewBlockItem, pageBlockLayoutTemplate, updateBlockLayoutItem],
  );

  const heightAdjusted = useMemo(
    () => containerRect?.height - headerRect?.height,
    [containerRect, headerRect],
  );

  const beforeHidden = useMemo(() => !selectedBlockItem, [selectedBlockItem]);

  const { data: dataPipeline } = api.pipelines.detail(objectAttributes?.data_source?.pipeline_uuid);
  const pipeline: PipelineType = useMemo(() => dataPipeline?.pipeline, [dataPipeline]);
  const blocksFromPipeline: BlockType[] = useMemo(
    () => sortByKey(pipeline?.blocks || [], 'uuid'),
    [pipeline],
  );

  const { data: dataPipelines } = api.pipelines.list();
  const pipelines: PipelineType[] = useMemo(
    () => sortByKey(dataPipelines?.pipelines || [], 'uuid'),
    [dataPipelines],
  );

  const { data: dataPipelineSchedules } = api.pipeline_schedules.pipelines.list(pipeline?.uuid);
  const pipelineSchedules = useMemo(
    () => dataPipelineSchedules?.pipeline_schedules,
    [dataPipelineSchedules],
  );

  const blockForChartConfigurations = useMemo(
    () => ({
      ...selectedBlockItem,
      ...objectAttributes,
      data: {
        ...selectedBlockItem?.data,
        ...objectAttributes?.data,
        ...blockLayoutItemServer?.data,
      },
    }),
    [blockLayoutItemServer, objectAttributes, selectedBlockItem],
  );

  const before = useMemo(
    () =>
      beforeHidden ? null : (
        <div
          style={{
            paddingBottom: UNITS_BETWEEN_ITEMS_IN_SECTIONS * UNIT,
            paddingTop: typeof topOffset === 'undefined' ? ASIDE_HEADER_HEIGHT : 0,
          }}
        >
          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            <Spacing mb={1}>
              <Text bold>Chart name</Text>
              <Text muted small>
                Human readable name for your chart.
              </Text>
            </Spacing>

            <TextInput
              // @ts-ignore
              onChange={e =>
                setObjectAttributes(
                  prev => ({
                    ...prev,
                    name_new: e.target.value,
                  }),
                  {
                    skip_render: true,
                  },
                )
              }
              placeholder="Type name for chart..."
              primary
              setContentOnMount
              value={objectAttributes?.name_new || ''}
            />
          </Spacing>

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            <Spacing mb={1}>
              <Text bold>Chart type</Text>
              <Text muted small>
                Choose how you want to display your data.
              </Text>
            </Spacing>

            <Select
              onChange={e =>
                setObjectAttributes(
                  prev => ({
                    ...prev,
                    configuration: {
                      chart_type: e.target.value,
                    },
                  }),
                  {
                    skip_render: true,
                  },
                )
              }
              placeholder="Select chart type"
              primary
              value={objectAttributes?.configuration?.chart_type || ''}
            >
              {CHART_TYPES.concat(ChartTypeEnum.CUSTOM).map(val => (
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
            <Headline>Data source</Headline>
          </Spacing>

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            <Spacing mb={1}>
              <Text bold>Data source type</Text>
              <Text muted small>
                Configure where the data for this chart comes from.
              </Text>
            </Spacing>

            <Select
              onChange={e =>
                setObjectAttributes(
                  prev => ({
                    ...prev,
                    data_source: {
                      ...prev?.data_source,
                      type: e.target.value,
                    },
                  }),
                  {
                    skip_render: true,
                  },
                )
              }
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

          {[
            DataSourceEnum.BLOCK,
            DataSourceEnum.BLOCK_RUNS,
            DataSourceEnum.PIPELINE_RUNS,
            DataSourceEnum.PIPELINE_SCHEDULES,
            DataSourceEnum.SYSTEM_METRICS,
          ].includes(objectAttributes?.data_source?.type) && (
            <>
              <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
                <Spacing mb={1}>
                  <Text bold>Pipeline UUID</Text>
                  <Text muted small>
                    Select the pipeline the data source comes from.
                  </Text>
                </Spacing>

                <Select
                  monospace
                  // @ts-ignore
                  onChange={e =>
                    setObjectAttributes(
                      prev => ({
                        ...prev,
                        data_source: {
                          ...prev?.data_source,
                          block_uuid: null,
                          pipeline_schedule_id: null,
                          pipeline_uuid: e.target.value,
                        },
                      }),
                      {
                        skip_render: true,
                      },
                    )
                  }
                  primary
                  value={objectAttributes?.data_source?.pipeline_uuid || ''}
                >
                  <option value={null} />

                  {pipelines?.map(({ uuid }) => (
                    <option key={uuid} value={uuid}>
                      {uuid}
                    </option>
                  ))}
                </Select>
              </Spacing>
            </>
          )}

          {[DataSourceEnum.PIPELINE_RUNS].includes(objectAttributes?.data_source?.type) && (
            <>
              <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
                <Spacing mb={1}>
                  <Text bold>Trigger</Text>
                  <Text muted small>
                    Select the trigger that the pipeline runs should belong to.
                  </Text>
                </Spacing>

                <Select
                  monospace
                  // @ts-ignore
                  onChange={e =>
                    setObjectAttributes(
                      prev => ({
                        ...prev,
                        data_source: {
                          ...prev?.data_source,
                          pipeline_schedule_id: e.target.value,
                        },
                      }),
                      {
                        skip_render: true,
                      },
                    )
                  }
                  primary
                  value={objectAttributes?.data_source?.pipeline_schedule_id || ''}
                >
                  <option value={null} />

                  {pipelineSchedules?.map(({ id, name }) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Spacing>
            </>
          )}

          {[DataSourceEnum.BLOCK, DataSourceEnum.SYSTEM_METRICS].includes(
            objectAttributes?.data_source?.type,
          ) && (
            <>
              <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
                <Spacing mb={1}>
                  <Text bold>Block UUID</Text>
                  <Text muted small>
                    Select the block the data source comes from.
                  </Text>
                </Spacing>

                <Select
                  monospace
                  // @ts-ignore
                  onChange={e =>
                    setObjectAttributes(
                      prev => ({
                        ...prev,
                        data_source: {
                          ...prev?.data_source,
                          block_uuid: e.target.value,
                        },
                      }),
                      {
                        skip_render: true,
                      },
                    )
                  }
                  primary
                  value={objectAttributes?.data_source?.block_uuid || ''}
                >
                  <option value={null} />

                  {blocksFromPipeline?.map(({ uuid }) => (
                    <option key={uuid} value={uuid}>
                      {uuid}
                    </option>
                  ))}
                </Select>
              </Spacing>

              <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
                <Spacing mb={1}>
                  <Text bold>Partitions</Text>
                  <Text muted small>
                    Enter a positive or a negative number. If positive, then data from the block
                    will be the most recent N partitions. If negative, then data from the block will
                    be the oldest N partitions.
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
                  onChange={e =>
                    setObjectAttributes(
                      prev => ({
                        ...prev,
                        data_source: {
                          ...prev?.data_source,
                          partitions:
                            typeof e.target.value !== 'undefined'
                              ? Number(e.target.value)
                              : e.target.value,
                        },
                      }),
                      {
                        skip_render: true,
                      },
                    )
                  }
                  placeholder="Enter number of partitions"
                  primary
                  setContentOnMount
                  type="number"
                  value={objectAttributes?.data_source?.partitions || ''}
                />
              </Spacing>
            </>
          )}

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            <Spacing mb={1}>
              <Text bold>Refresh interval</Text>
              <Text muted small>
                How frequent do you want this chart to automatically fetch new data from its data
                source? Enter a number in milliseconds (e.g. 1000ms is 1 second).
              </Text>
            </Spacing>

            <TextInput
              monospace
              // @ts-ignore
              onChange={e =>
                setObjectAttributes(
                  prev => ({
                    ...prev,
                    data_source: {
                      ...prev?.data_source,
                      refresh_interval: e.target.value,
                    },
                  }),
                  {
                    skip_render: true,
                  },
                )
              }
              placeholder="Enter number for refresh interval"
              primary
              setContentOnMount
              type="number"
              value={objectAttributes?.data_source?.refresh_interval || 60000}
            />
          </Spacing>

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
            <Divider light />
          </Spacing>

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            <Headline>Chart display settings</Headline>
          </Spacing>

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            {!blockForChartConfigurations?.data_source ? (
              <Text default>Please select a data source type above.</Text>
            ) : (
              <Text default>
                Number of columns from data source:{' '}
                {typeof blockForChartConfigurations?.data?.columns !== 'undefined' ? (
                  <Text bold inline monospace>
                    {blockForChartConfigurations?.data?.columns?.length}
                  </Text>
                ) : (
                  <Spacing mt={1}>
                    <Spinner inverted small />
                  </Spacing>
                )}
              </Text>
            )}
          </Spacing>

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            <ChartConfigurations
              block={blockForChartConfigurations}
              updateConfiguration={(configuration, opts) => {
                setObjectAttributes(
                  prev => ({
                    ...prev,
                    configuration: {
                      ...prev?.configuration,
                      ...configuration,
                    },
                  }),
                  opts,
                );
              }}
            />
          </Spacing>
        </div>
      ),
    [
      beforeHidden,
      blockForChartConfigurations,
      blocksFromPipeline,
      objectAttributes,
      pipelineSchedules,
      pipelines,
      setObjectAttributes,
      topOffset,
    ],
  );

  const after = useMemo(
    () =>
      selectedBlockItem && (
        <Spacing py={PADDING_UNITS}>
          <Spacing mb={UNITS_BETWEEN_ITEMS_IN_SECTIONS} px={PADDING_UNITS}>
            <Spacing mb={1}>
              <Headline>Custom code</Headline>
            </Spacing>

            <Text default>
              Write code for custom data sources, parsing, etc. For more information on what is
              possible, please check out the{' '}
              <Link
                href="https://docs.mage.ai/visualizations/dashboards#custom-code-for-chart"
                openNewWindow
              >
                chart documentation
              </Link>
              .
            </Text>
          </Spacing>

          <CodeEditor
            autoHeight
            block={{
              ...itemCached,
              ...selectedBlockItem,
            }}
            onChange={(val: string) => {
              setObjectAttributes(
                prev => ({
                  ...prev,
                  content: val,
                }),
                {
                  skip_render: true,
                },
              );
            }}
            value={objectAttributes?.content || itemCached?.content || ''}
            width="100%"
          />
        </Spacing>
      ),
    [itemCached, objectAttributes, selectedBlockItem, setObjectAttributes],
  );

  const beforeFooter = useMemo(
    () => (
      <Spacing p={PADDING_UNITS}>
        <FlexContainer>
          <Button
            fullWidth
            loading={isLoadingUpdateBlockLayoutItem}
            onClick={() => updateBlockLayoutItemCustom(objectAttributes)}
            primary
          >
            Save changes
          </Button>

          <Spacing mr={1} />

          <Button fullWidth onClick={() => setSelectedBlockItem(null)} secondary>
            Back to dashboard
          </Button>
        </FlexContainer>
      </Spacing>
    ),
    [
      isLoadingUpdateBlockLayoutItem,
      objectAttributes,
      setSelectedBlockItem,
      updateBlockLayoutItemCustom,
    ],
  );

  return (
    <TripleLayout
      after={after}
      afterHeightOffset={topOffset || 0}
      afterHidden={beforeHidden}
      afterMousedownActive={afterMousedownActive}
      afterWidth={afterWidth}
      before={before}
      beforeDraggableTopOffset={topOffset ? topOffset - ASIDE_HEADER_HEIGHT : 0}
      beforeFooter={!beforeHidden && beforeFooter}
      beforeHeader={
        <>
          <Breadcrumbs
            breadcrumbs={[
              {
                label: () => 'Back to dashboard',
                onClick: () => setSelectedBlockItem(null),
              },
              {
                bold: true,
                label: () => selectedBlockItem?.name || selectedBlockItem?.uuid,
              },
            ]}
          />
        </>
      }
      beforeHeaderOffset={6 * UNIT}
      beforeHeightOffset={topOffset || 0}
      beforeHidden={beforeHidden}
      beforeMousedownActive={beforeMousedownActive}
      beforeWidth={beforeWidth}
      contained
      excludeOffsetFromBeforeDraggableLeft
      headerOffset={topOffset || 0}
      hideAfterCompletely
      hideBeforeCompletely
      leftOffset={leftOffset || 0}
      mainContainerRef={mainContainerRef}
      setAfterMousedownActive={setAfterMousedownActive}
      setAfterWidth={setAfterWidth}
      setBeforeMousedownActive={setBeforeMousedownActive}
      setBeforeWidth={setBeforeWidth}
    >
      <div ref={refHeader} style={{ position: 'relative' }}>
        {selectedBlockItem && isLoadingFetchBlockLayoutItem && (
          <div style={{ position: 'absolute', width: '100%' }}>
            <Loading />
          </div>
        )}

        <FlexContainer justifyContent="space-between">
          <Flex flex={1}></Flex>

          {beforeHidden && !isEmpty && (
            <Spacing p={PADDING_UNITS}>
              {/* TODO (dangerous): uncomment below when there are more than 1 dropdown option */}
              {/*<FlyoutMenuWrapper
                items={[
                  // {
                  //   label: () => 'Existing chart',
                  //   onClick: () => false,
                  //   uuid: 'Existing chart',
                  // },
                  {
                    label: () => 'Create new chart',
                    onClick: () => {
                      createNewBlockItem();
                    },
                    uuid: 'Create new chart',
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
              </FlyoutMenuWrapper>*/}

              <Button
                beforeIcon={<Add size={UNIT * 2} />}
                onClick={() => createNewBlockItem()}
                primary
              >
                Create new chart
              </Button>
            </Spacing>
          )}
        </FlexContainer>
      </div>

      <DndProvider backend={HTML5Backend}>
        {selectedBlockItem && (
          <BlockLayoutItem
            block={{
              ...itemCached,
              ...selectedBlockItem,
            }}
            blockLayoutItem={{
              ...itemCached,
              ...blockLayoutItemServer,
              configuration: {
                ...itemCached?.configuration,
                ...blockLayoutItemServer?.configuration,
                ...objectAttributes?.configuration,
              },
              data: blockLayoutItemServer ? blockLayoutItemServer?.data : itemCached?.data,
              data_source: {
                ...itemCached?.data_source,
                ...blockLayoutItemServer?.data_source,
                ...objectAttributes?.data_source,
              },
            }}
            blockUUID={selectedBlockItem?.uuid}
            detail
            disableDrag
            height={heightAdjusted}
            pageBlockLayoutUUID={uuid}
            setSelectedBlockItem={setSelectedBlockItem}
            width={containerRect?.width}
          />
        )}

        <div
          style={{
            display: selectedBlockItem || isEmpty ? 'none' : null,
          }}
        >
          {rowsEl}
        </div>
        {!selectedBlockItem && isEmpty && emtpyState}
      </DndProvider>

      <Spacing mb={2} />
    </TripleLayout>
  );
}

export default BlockLayout;
