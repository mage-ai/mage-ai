import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useMutation } from 'react-query';

import BlockLayoutItemDetail from '../BlockLayoutItemDetail';
import BlockLayoutItemType, { RenderTypeEnum } from '@interfaces/BlockLayoutItemType';
import Button from '@oracle/elements/Button';
import ChartController from '@components/ChartBlock/ChartController';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import LayoutDivider from '../LayoutDivider';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { onSuccess } from '@api/utils/response';
import { ColumnType } from '@interfaces/PageBlockLayoutType';
import { DIVIDER_WIDTH } from '../LayoutDivider/index.style';
import { Ellipsis } from '@oracle/icons';
import { ItemStyle, WIDTH_OFFSET } from './index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { VARIABLE_NAME_HEIGHT } from '@interfaces/ChartBlockType';
import { useError } from '@context/Error';
import useAbortController from '@utils/hooks/useAbortController';

type BlockLayoutItemProps = {
  block?: BlockLayoutItemType;
  blockLayoutItem?: BlockLayoutItemType;
  blockUUID: string;
  columnIndex?: number;
  columnLayoutSettings?: ColumnType;
  columnsInRow?: number;
  createNewBlockItem?: (opts?: { columnIndex: number; rowIndex: number }) => void;
  detail?: boolean;
  disableDrag?: boolean;
  height?: number;
  isLoading?: boolean;
  first?: boolean;
  onDrop?: (opts: {
    blockLayoutItem: BlockLayoutItemType;
    columnIndex: number;
    rowIndex: number;
  }) => void;
  onFetchBlockLayoutItem?: (data: BlockLayoutItemType) => void;
  onSave?: () => void;
  pageBlockLayoutUUID: string;
  removeBlockLayoutItem?: () => void;
  rowIndex?: number;
  setSelectedBlockItem?: (block: BlockLayoutItemType) => void;
  updateLayout?: (column: ColumnType) => void;
  width?: number;
};

function BlockLayoutItem({
  block,
  blockLayoutItem: blockLayoutItemProp = null,
  blockUUID,
  columnIndex,
  columnLayoutSettings,
  columnsInRow,
  createNewBlockItem,
  detail,
  disableDrag,
  first,
  height,
  isLoading: isLoadingProp,
  onDrop,
  onFetchBlockLayoutItem,
  onSave,
  pageBlockLayoutUUID,
  removeBlockLayoutItem,
  rowIndex,
  setSelectedBlockItem,
  updateLayout,
  width,
}: BlockLayoutItemProps) {
  const refMenu = useRef(null);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);

  const [isHovering, setIsHovering] = useState<boolean>(false);

  const [columnLayoutSettingsInit] = useState<ColumnType>(columnLayoutSettings);
  const [blockLayoutItemState, setBlockLayoutItem] = useState<BlockLayoutItemType>(block);
  const blockLayoutItem = useMemo(
    () => blockLayoutItemProp || blockLayoutItemState,
    [blockLayoutItemProp, blockLayoutItemState],
  );

  const [showError] = useError(null, {}, [], {
    uuid: `BlockLayoutItem/${pageBlockLayoutUUID}/${blockUUID}`,
  });

  const [dataBlockLayoutItem, setDataBlockLayoutItem] = useState<{
    block_layout_item?: BlockLayoutItemType;
  }>({
    block_layout_item: blockLayoutItem,
  });

  const [fetchBlockLayoutItem, { isLoading: isLoadingFetchBlockLayoutItem }]: any = useMutation(
    (
      opts: {
        skip_render?: boolean;
      } = {},
    ) =>
      api.block_layout_items.page_block_layouts.detailAsync(
        encodeURIComponent(pageBlockLayoutUUID),
        encodeURIComponent(blockUUID),
        {
          skip_render: opts?.skip_render ? true : false,
        },
      ),
    {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: resp => {
            if (resp?.error) {
              showError({
                response: resp,
              });
            } else {
              const item = resp?.block_layout_item;
              // setDataBlockLayoutItem(resp);
              // setBlockLayoutItem(item);
              if (onFetchBlockLayoutItem) {
                onFetchBlockLayoutItem?.(item);
              }
            }
          },
        }),
    },
  );

  const {
    doFetch,
    data: data2,
    isLoading: isLoadingFetchBlockLayoutItem2,
    error,
  } = useAbortController(() => !detail && fetchBlockLayoutItem());

  useEffect(() => {
    doFetch();
    // If we add doFetch in this array, it will cause an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Minimum 1000ms refresh interval
  const refreshInterval = useMemo(() => {
    const ri = blockLayoutItem?.data_source?.refresh_interval;

    if (!ri) {
      return 60000;
    }

    return ri;
  }, [blockLayoutItem?.data_source?.refresh_interval]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (blockLayoutItemProp) {
      intervalRef.current = setInterval(doFetch, refreshInterval);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // If we add doFetch in this array, it will cause an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockLayoutItemProp, refreshInterval]);

  const isLoading: boolean = useMemo(
    () => isLoadingProp && isLoadingFetchBlockLayoutItem,
    [isLoadingProp, isLoadingFetchBlockLayoutItem],
  );

  const data = useMemo(
    () => blockLayoutItem?.data || dataBlockLayoutItem?.block_layout_item?.data,
    [blockLayoutItem, dataBlockLayoutItem],
  );

  const buildChart = useCallback(
    ({ height: heightArg, width: widthArg }) => {
      if (!data) {
        return null;
      }

      const renderData = data?.render;
      if (renderData) {
        const renderType = data?.render_type;

        if (RenderTypeEnum.JPEG === renderType || RenderTypeEnum.JPG === renderType) {
          return (
            <img height={heightArg} src={`data:image/jpeg;base64,${renderData}`} width={widthArg} />
          );
        } else if (RenderTypeEnum.PNG === renderType) {
          return (
            <img height={heightArg} src={`data:image/png;base64,${renderData}`} width={widthArg} />
          );
        } else if (RenderTypeEnum.HTML === renderType) {
          return (
            <iframe
              // @ts-ignore
              srcDoc={renderData}
              style={{
                height: heightArg,
                width: widthArg,
              }}
            />
          );
        }
      }

      return (
        <ChartController
          block={{
            ...blockLayoutItem,
            configuration: {
              ...blockLayoutItem?.configuration,
              [VARIABLE_NAME_HEIGHT]: heightArg,
            },
          }}
          data={data}
          width={widthArg}
          xAxisLabel={blockLayoutItem?.configuration?.x_axis_label}
        />
      );
    },
    [blockLayoutItem, data],
  );

  const [collected, drag] = useDrag(
    () => ({
      collect: monitor => ({
        isDragging: !!monitor.isDragging(),
      }),
      item: {
        blockLayoutItem,
        columnIndex,
        rowIndex,
      },
      type: 'BlockLayoutItem',
    }),
    [blockLayoutItem, columnIndex, rowIndex],
  );

  const [, drop] = useDrop(
    () => ({
      accept: 'BlockLayoutItem',
      drop: (opts: {
        blockLayoutItem: BlockLayoutItemType;
        columnIndex: number;
        rowIndex: number;
      }) => onDrop?.(opts),
    }),
    [onDrop],
  );

  if (detail) {
    return <BlockLayoutItemDetail buildChart={buildChart} height={height} width={width} />;
  }

  return (
    <>
      {first && (
        <LayoutDivider
          onClickAdd={() =>
            createNewBlockItem({
              columnIndex,
              rowIndex,
            })
          }
        />
      )}

      <Flex flex={1} flexDirection="column">
        <div
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          ref={drop}
        >
          <ItemStyle {...collected} ref={disableDrag ? null : drag}>
            <Spacing mb={1}>
              <FlexContainer alignContent="center" justifyContent="space-between">
                <Spacing py={1}>
                  <Text bold default>
                    {blockLayoutItem?.name || blockUUID}
                  </Text>
                </Spacing>

                <div>
                  <FlyoutMenuWrapper
                    items={[
                      {
                        label: () => 'Edit content',
                        onClick: () => setSelectedBlockItem?.(blockLayoutItem),
                        uuid: 'Edit content',
                      },
                      {
                        label: () => 'Change height and/or width',
                        onClick: () => setEditing(true),
                        uuid: 'Change',
                      },
                      {
                        label: () => 'Remove chart',
                        onClick: () => removeBlockLayoutItem?.(),
                        uuid: 'Remove chart',
                      },
                    ]}
                    onClickCallback={() => setMenuVisible(false)}
                    onClickOutside={() => setMenuVisible(false)}
                    open={menuVisible}
                    parentRef={refMenu}
                    rightOffset={0}
                    uuid={`BlockLayoutItem/${blockUUID}`}
                  >
                    {(isHovering || menuVisible) && (
                      <Button
                        disabled={isLoading}
                        iconOnly
                        loading={isLoading}
                        noBackground
                        onClick={() => {
                          setMenuVisible(true);
                        }}
                      >
                        <Ellipsis default size={UNIT * 2} />
                      </Button>
                    )}
                  </FlyoutMenuWrapper>
                </div>
              </FlexContainer>
            </Spacing>

            {editing && (
              <>
                <FlexContainer alignItems="center" fullWidth>
                  <Flex flex={1} flexDirection="column">
                    <Text bold muted small>
                      Width (flex box)
                    </Text>
                    <TextInput
                      compact
                      fullWidth
                      // @ts-ignore
                      onChange={e =>
                        updateLayout?.({
                          ...columnLayoutSettings,
                          width:
                            typeof e.target.value !== 'undefined'
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                      primary
                      setContentOnMount
                      small
                      type="number"
                      value={columnLayoutSettings?.width || ''}
                    />
                  </Flex>

                  <Spacing mr={1} />

                  <Flex flex={1} flexDirection="column">
                    <Text bold muted small>
                      Max width (%)
                    </Text>
                    <TextInput
                      compact
                      fullWidth
                      label="Max width percentage"
                      // @ts-ignore
                      onChange={e =>
                        updateLayout?.({
                          ...columnLayoutSettings,
                          max_width_percentage:
                            typeof e.target.value !== 'undefined'
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                      primary
                      setContentOnMount
                      small
                      type="number"
                      value={columnLayoutSettings?.max_width_percentage || ''}
                    />
                  </Flex>

                  <Spacing mr={1} />

                  <Flex flex={1} flexDirection="column">
                    <Text bold muted small>
                      Height (pixels)
                    </Text>
                    <TextInput
                      compact
                      fullWidth
                      // @ts-ignore
                      onChange={e =>
                        updateLayout?.({
                          ...columnLayoutSettings,
                          height:
                            typeof e.target.value !== 'undefined'
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                      primary
                      setContentOnMount
                      small
                      type="number"
                      value={columnLayoutSettings?.height || ''}
                    />
                  </Flex>
                </FlexContainer>

                <Spacing mt={PADDING_UNITS}>
                  <FlexContainer alignItems="center" justifyContent="flex-end">
                    <Button
                      compact
                      onClick={() => {
                        onSave?.();
                        setEditing(false);
                      }}
                      primary
                      small
                    >
                      Save
                    </Button>

                    <Spacing mr={1} />

                    <Button
                      compact
                      onClick={() => {
                        setEditing(false);
                        updateLayout?.(columnLayoutSettingsInit);
                      }}
                      small
                    >
                      Cancel
                    </Button>
                  </FlexContainer>
                </Spacing>
              </>
            )}

            {!dataBlockLayoutItem && (
              <Spacing p={PADDING_UNITS}>
                <Spinner />
              </Spacing>
            )}

            {dataBlockLayoutItem && !data && (
              <Text muted>Chart hasn’t been configured or no data was retrieved.</Text>
            )}

            {data &&
              buildChart({
                height: height || blockLayoutItem?.configuration?.[VARIABLE_NAME_HEIGHT],
                width:
                  width - (WIDTH_OFFSET + 1) - (columnsInRow ? DIVIDER_WIDTH / columnsInRow : 0),
              })}
          </ItemStyle>
        </div>
      </Flex>

      <LayoutDivider
        onClickAdd={() =>
          createNewBlockItem({
            columnIndex: columnIndex + 1,
            rowIndex,
          })
        }
      />
    </>
  );
}

export default BlockLayoutItem;
