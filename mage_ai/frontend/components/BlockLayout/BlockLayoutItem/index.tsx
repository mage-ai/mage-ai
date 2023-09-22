import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';

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
import { ColumnType } from '@interfaces/PageBlockLayoutType';
import { DIVIDER_WIDTH } from '../LayoutDivider/index.style';
import { Ellipsis } from '@oracle/icons';
import { ItemStyle, WIDTH_OFFSET } from './index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { VARIABLE_NAME_HEIGHT } from '@interfaces/ChartBlockType';

type BlockLayoutItemProps = {
  block?: BlockLayoutItemType;
  blockLayoutItem?: BlockLayoutItemType;
  blockUUID: string;
  columnIndex?: number;
  columnLayoutSettings?: ColumnType;
  columnsInRow?: number;
  createNewBlockItem?: (opts?: {
    columnIndex: number;
    rowIndex: number;
  }) => void;
  detail?: boolean;
  disableDrag?: boolean;
  height?: number;
  first?: boolean;
  onDrop?: (opts: {
    blockLayoutItem: BlockLayoutItemType;
    columnIndex: number;
    rowIndex: number;
  }) => void;
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
  onDrop,
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
  const [blockLayoutItemState, setBlockLayoutItem] = useState<BlockLayoutItemType>(null);
  const blockLayoutItem = useMemo(() => blockLayoutItemProp || blockLayoutItemState, [
    blockLayoutItemProp,
    blockLayoutItemState,
  ]);
  const [dataState, setData] = useState(null);
  const data = useMemo(() => blockLayoutItem?.data || dataState, [
    blockLayoutItem,
    dataState,
  ]);

  // Minimum 1000ms refresh interval
  const refreshInterval = useMemo(() => {
    const ri = blockLayoutItem?.data_source?.refresh_interval;

    if (ri) {
      return Math.max(ri, 1000);
    }

    return ri;
  }, [
    blockLayoutItem,
  ]);

  const {
    data: dataBlockLayoutItem,
  } = api.block_layout_items.page_block_layouts.detail(
    !blockLayoutItemProp && encodeURIComponent(pageBlockLayoutUUID),
    !blockLayoutItemProp && encodeURIComponent(blockUUID),
    {},
    {
      refreshInterval,
      revalidateOnFocus: !refreshInterval,
    },
  );

  useEffect(() => {
    if (!blockLayoutItem) {
      if (block) {
        setBlockLayoutItem(block);
      } else if (dataBlockLayoutItem?.block_layout_item) {
        setBlockLayoutItem(dataBlockLayoutItem?.block_layout_item);
      }
    }
  }, [
    block,
    blockLayoutItem,
    dataBlockLayoutItem,
  ]);

  useEffect(() => {
    if (dataBlockLayoutItem?.block_layout_item?.data) {
      setData(dataBlockLayoutItem?.block_layout_item?.data);
    }
  }, [
    dataBlockLayoutItem?.block_layout_item?.data,
  ]);

  const buildChart = useCallback(({
    height: heightArg,
    width: widthArg,
  }) => {
    if (!data) {
      return null;
    }

    const renderData = data?.render;
    if (renderData) {
      const renderType = data?.render_type;

      if (RenderTypeEnum.JPEG === renderType || RenderTypeEnum.JPG === renderType) {
        return (
          <img
            height={heightArg}
            src={`data:image/jpeg;base64,${renderData}`}
            width={widthArg}
          />
        );
      } else if (RenderTypeEnum.PNG === renderType) {
        return (
          <img
            height={heightArg}
            src={`data:image/png;base64,${renderData}`}
            width={widthArg}
          />
        );
      } else if (RenderTypeEnum.HTML === renderType) {
        return (
          <iframe
            // @ts-ignore
            srcdoc={renderData}
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
  }, [
    blockLayoutItem,
    data,
  ]);

  const [collected, drag] = useDrag(() => ({
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    item: {
      blockLayoutItem,
      columnIndex,
      rowIndex,
    },
    type: 'BlockLayoutItem',
  }), [
    blockLayoutItem,
    columnIndex,
    rowIndex,
  ]);

  const [, drop] = useDrop(() => ({
    accept: 'BlockLayoutItem',
    drop: (opts: {
      blockLayoutItem: BlockLayoutItemType;
      columnIndex: number;
      rowIndex: number;
    }) => onDrop?.(opts),
  }), []);

  if (detail) {
    return (
      <BlockLayoutItemDetail
        blockLayoutItem={blockLayoutItem}
        buildChart={buildChart}
        height={height}
        width={width}
      />
    );
  }

  return (
    <>
      {first && (
        <LayoutDivider
          onClickAdd={() => createNewBlockItem({
            columnIndex,
            rowIndex,
          })}
        />
      )}

      <Flex flex={1} flexDirection="column">
        <div
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          ref={drop}
        >
          <ItemStyle
            {...collected}
            ref={disableDrag ? null : drag}
          >
            <Spacing mb={1}>
              <FlexContainer
                alignContent="center"
                justifyContent="space-between"
              >
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
                        iconOnly
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
                <FlexContainer
                  alignItems="center"
                  fullWidth
                >
                  <Flex flex={1} flexDirection="column">
                    <Text bold muted small>
                      Width (flex box)
                    </Text>
                    <TextInput
                      compact
                      fullWidth
                      // @ts-ignore
                      onChange={e => updateLayout?.({
                        ...columnLayoutSettings,
                        width: typeof e.target.value !== 'undefined'
                          ? Number(e.target.value)
                          : e.target.value
                        ,
                      })}
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
                      onChange={e => updateLayout?.({
                        ...columnLayoutSettings,
                        max_width_percentage: typeof e.target.value !== 'undefined'
                          ? Number(e.target.value)
                          : e.target.value
                        ,
                      })}
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
                      onChange={e => updateLayout?.({
                        ...columnLayoutSettings,
                        height: typeof e.target.value !== 'undefined'
                          ? Number(e.target.value)
                          : e.target.value
                        ,
                      })}
                      primary
                      setContentOnMount
                      small
                      type="number"
                      value={columnLayoutSettings?.height || ''}
                    />
                  </Flex>
                </FlexContainer>

                <Spacing mt={PADDING_UNITS}>
                  <FlexContainer
                    alignItems="center"
                    justifyContent="flex-end"
                  >
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

            {!dataBlockLayoutItem && !data && <Spinner inverted />}
            {data && buildChart({
              height: height || blockLayoutItem?.configuration?.[VARIABLE_NAME_HEIGHT],
              width: width - (WIDTH_OFFSET + 1) - (columnsInRow ? DIVIDER_WIDTH / columnsInRow : 0),
            })}
          </ItemStyle>
        </div>

      </Flex>

      <LayoutDivider
        onClickAdd={() => createNewBlockItem({
          columnIndex: columnIndex + 1,
          rowIndex,
        })}
      />
    </>
  );
}

export default BlockLayoutItem;
