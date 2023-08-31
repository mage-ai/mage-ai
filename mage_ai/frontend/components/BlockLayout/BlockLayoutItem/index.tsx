import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import BlockLayoutItemDetail from '../BlockLayoutItemDetail';
import BlockLayoutItemType from '@interfaces/BlockLayoutItemType';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import ChartController from '@components/ChartBlock/ChartController';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { ColumnType } from '@interfaces/PageBlockLayoutType';
import { Ellipsis } from '@oracle/icons';
import { ItemStyle, WIDTH_OFFSET } from './index.style';
import { PADDING_UNITS, UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';
import { VARIABLE_NAME_HEIGHT } from '@interfaces/ChartBlockType';

type BlockLayoutItemProps = {
  block?: BlockLayoutItemType;
  blockLayoutItem?: BlockLayoutItemType;
  blockUUID: string;
  detail?: boolean;
  height?: number;
  columnLayoutSettings?: ColumnType;
  onSave?: () => void;
  pageBlockLayoutUUID: string;
  setSelectedBlockItem?: (block: BlockLayoutItemType) => void;
  updateLayout: (column: ColumnType) => void;
  width?: number;
};

function BlockLayoutItem({
  block,
  blockLayoutItem: blockLayoutItemProp = null,
  blockUUID,
  columnLayoutSettings,
  detail,
  height,
  onSave,
  pageBlockLayoutUUID,
  setSelectedBlockItem,
  updateLayout,
  width,
}: BlockLayoutItemProps) {
  const refMenu = useRef(null);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);

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

  const refreshInterval = useMemo(() => blockLayoutItem?.data_source?.refresh_interval, [
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
    <ItemStyle>
      <Spacing mb={1}>
        <FlexContainer
          justifyContent="space-between"
        >
          <Text bold default>
            {blockLayoutItem?.name || blockUUID}
          </Text>

          <div>
            <FlyoutMenuWrapper
              items={[
                {
                  label: () => 'Edit content',
                  onClick: () => setSelectedBlockItem?.(blockLayoutItem),
                },
                {
                  label: () => 'Change height and/or width',
                  onClick: () => setEditing(true),
                },
              ]}
              onClickCallback={() => setMenuVisible(false)}
              onClickOutside={() => setMenuVisible(false)}
              open={menuVisible}
              parentRef={refMenu}
              rightOffset={0}
              uuid={`BlockLayoutItem/${blockUUID}`}
            >
              <Button
                iconOnly
                noBackground
                onClick={() => {
                  setMenuVisible(true);
                }}
              >
                <Ellipsis default />
              </Button>
            </FlyoutMenuWrapper>
          </div>

        </FlexContainer>
      </Spacing>

      {!dataBlockLayoutItem && !data && <Spinner inverted />}
      {data && buildChart({
        height: height || blockLayoutItem?.configuration?.[VARIABLE_NAME_HEIGHT],
        width: width - (WIDTH_OFFSET + 1),
      })}

      {editing && (
        <>
          <Spacing my={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
            <Divider light />
          </Spacing>

          <FlexContainer
            alignItems="center"
            fullWidth
          >
            <TextInput
              compact
              fullWidth
              label="Width"
              // @ts-ignore
              onChange={e => updateLayout({
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

            <Spacing mr={1} />

            <TextInput
              compact
              fullWidth
              label="Max width percentage"
              // @ts-ignore
              onChange={e => updateLayout({
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

            <Spacing mr={1} />

            <TextInput
              compact
              fullWidth
              label="Height"
              // @ts-ignore
              onChange={e => updateLayout({
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
                  updateLayout(columnLayoutSettingsInit);
                }}
                secondary
                small
              >
                Cancel
              </Button>
            </FlexContainer>
          </Spacing>
        </>
      )}
    </ItemStyle>
  );
}

export default BlockLayoutItem;
