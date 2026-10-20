import { ThemeContext } from 'styled-components';
import { useContext, useMemo } from 'react';

import Badge from '@oracle/components/Badge';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Circle from '@oracle/elements/Circle';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import {
  CircleWithArrowUp,
  CubeWithArrowDown,
  DBT as DBTIcon,
  FrameBoxSelection,
  HexagonAll,
  Sensor,
  Union,
} from '@oracle/icons';
import {
  BORDER_WIDTH,
  ICON_SIZE,
  BodyStyle,
  HeaderStyle,
  IconStyle,
  NodeContainerStyle,
  NodeStyle,
  StatusStyle,
} from './index.style';
import { Check, Close } from '@oracle/icons';
import { ThemeType } from '@oracle/styles/themes/constants';
import {
  HEADER_SPACING_HORIZONTAL_UNITS,
  STATUS_SIZE,
  blockTagsText,
  getBlockHeaderSubtitle,
  getBlockHeaderText,
} from './utils';
import {
  getColorsForBlockType,
  getGradientColorForBlockType,
} from '@components/CodeBlock/index.style';
import { getBlockStatus, getRuntimeText } from '../utils';
import { range } from '@utils/array';

const ICON_MAPPING = {
  [BlockTypeEnum.DATA_EXPORTER]: CircleWithArrowUp,
  [BlockTypeEnum.DATA_LOADER]: CubeWithArrowDown,
  [BlockTypeEnum.DBT]: DBTIcon,
  [BlockTypeEnum.GLOBAL_DATA_PRODUCT]: HexagonAll,
  [BlockTypeEnum.SENSOR]: Sensor,
  [BlockTypeEnum.TRANSFORMER]: FrameBoxSelection,
};

type BlockNodeProps = {
  anotherBlockSelected?: boolean;
  block: BlockType;
  blocksWithSameDownstreamBlocks?: BlockType[];
  callbackBlocks?: BlockType[];
  children?: any;
  conditionalBlocks?: BlockType[];
  disabled?: boolean;
  downstreamBlocks?: BlockType[];
  extensionBlocks?: BlockType[];
  hasFailed?: boolean;
  height: number;
  hideNoStatus?: boolean;
  hideStatus?: boolean;
  isCancelled?: boolean;
  isConditionFailed?: boolean;
  isDragging?: boolean;
  isInProgress?: boolean;
  isQueued?: boolean;
  isSuccessful?: boolean;
  opacity?: number;
  pipeline: PipelineType;
  runtime?: number;
  selected?: boolean;
  selectedBlock?: BlockType;
};

function BlockNode({
  anotherBlockSelected,
  block,
  blocksWithSameDownstreamBlocks,
  callbackBlocks,
  children,
  conditionalBlocks,
  disabled,
  downstreamBlocks,
  extensionBlocks,
  hasFailed,
  height,
  hideNoStatus,
  hideStatus,
  isCancelled,
  isConditionFailed,
  isDragging,
  isInProgress,
  isQueued,
  isSuccessful,
  opacity,
  pipeline,
  runtime: runtimeFromBlockRun,
  selected,
  selectedBlock,
}: BlockNodeProps) {
  const themeContext: ThemeType = useContext(ThemeContext);

  const noStatus = !(
    isInProgress ||
    isQueued ||
    hasFailed ||
    isSuccessful ||
    isCancelled ||
    isConditionFailed
  );
  const failed = hasFailed && !(isInProgress || isQueued);
  const success = !failed && isSuccessful && !(isInProgress || isQueued);

  let tooltipText = '';
  if (noStatus) {
    tooltipText = 'No status';
  } else if (success) {
    tooltipText = 'Successful execution';
  } else if (failed) {
    tooltipText = 'Failed execution';
  } else if (isInProgress) {
    tooltipText = 'Currently executiing';
  } else if (isCancelled) {
    tooltipText = 'Cancelled execution';
  }

  const {
    color,
    runtime: runtimeFromBlock,
    type,
  } = block || {};
  const {
    accent,
    accentLight,
  } = getColorsForBlockType(
    type,
    {
      blockColor: color,
      theme: themeContext,
    },
  );

  const tagsText = useMemo(() => blockTagsText(block), [block]);

  const iconEl = useMemo(() => {
    const El = ICON_MAPPING[type] || Union;
    let backgroundColor;
    let borderColor;
    let inverted = false;

    if ([
      BlockTypeEnum.CALLBACK,
      BlockTypeEnum.CHART,
      BlockTypeEnum.CONDITIONAL,
      BlockTypeEnum.CUSTOM,
      BlockTypeEnum.DATA_EXPORTER,
      BlockTypeEnum.DATA_LOADER,
      BlockTypeEnum.EXTENSION,
      BlockTypeEnum.SCRATCHPAD,
      BlockTypeEnum.SENSOR,
      BlockTypeEnum.MARKDOWN,
      BlockTypeEnum.TRANSFORMER,
    ].includes(type)) {
      backgroundColor = accent;
    } else if ([
      BlockTypeEnum.DBT,
    ].includes(type)) {
      borderColor = accent;
    }

    if ([
      BlockTypeEnum.DATA_EXPORTER,
    ].includes(type)) {
      inverted = true;
    }

    return (
      <IconStyle
        backgroundColor={backgroundColor}
        borderColor={borderColor}
      >
        <div
          style={{
            height: ICON_SIZE,
            width: ICON_SIZE,
          }}
        >
          <El inverted={inverted} size={ICON_SIZE} />
        </div>
      </IconStyle>
    );
  }, [
    accent,
    type,
  ]);

  const {
    borderColorBottom,
    borderColorLeft,
    borderColorRight,
    borderColorTop,
  }: {
    borderColorBottom?: string;
    borderColorLeft?: string;
    borderColorRight?: string;
    borderColorTop?: string;
  } = useMemo(() => {
    const borderColors = [];
    const borderColorsSelected = [];

    if (isQueued) {
      range(4).forEach(() => {
        borderColors.push(themeContext?.content?.muted);
        borderColorsSelected.push(themeContext?.content?.muted);
      });
    } else if (blocksWithSameDownstreamBlocks?.length >= 2 && downstreamBlocks?.length >= 1) {
      const arr = [];

      if (blocksWithSameDownstreamBlocks?.find(({ uuid }) => selectedBlock?.uuid === uuid)) {
        arr.push(selectedBlock);
      } else {
        arr.push(...blocksWithSameDownstreamBlocks);
      }

      arr?.slice(0, 4)?.forEach((upstreamBlock: BlockType) => {
        const {
          accent: accent2,
          accentLight: accentLight2,
        } = getColorsForBlockType(
          upstreamBlock?.type,
          {
            blockColor: upstreamBlock?.color,
            theme: themeContext,
          },
        );
        borderColors.push(accentLight2);
        borderColorsSelected.push(accent2);
      });
    } else {
      borderColors.push(...[accentLight, accentLight, accentLight, accentLight]);
      borderColorsSelected.push(...[accent, accent, accent, accent]);
    }

    if (borderColors?.length < 4) {
      let idx = 0;
      const count = borderColors?.length || 0;
      while (borderColors?.length < 4) {
        borderColors.push(borderColors?.[idx]);
        idx += 1;
        if (idx === count) {
          idx = 0;
        }
      }
    }

    if (borderColorsSelected?.length < 4) {
      let idx = 0;
      const count = borderColorsSelected?.length || 0;
      while (borderColorsSelected?.length < 4) {
        borderColorsSelected.push(borderColorsSelected?.[idx]);
        idx += 1;
        if (idx === count) {
          idx = 0;
        }
      }
    }

    return [
      'borderColorBottom',
      'borderColorLeft',
      'borderColorRight',
      'borderColorTop',
    ].reduce((acc, key: string, idx: number) => ({
      ...acc,
      [key]: !selected && anotherBlockSelected ? borderColors?.[idx] : borderColorsSelected?.[idx],
    }), {});
  }, [
    accent,
    accentLight,
    anotherBlockSelected,
    blocksWithSameDownstreamBlocks,
    downstreamBlocks,
    isQueued,
    selected,
    selectedBlock,
    themeContext,
  ]);

  return (
    <NodeContainerStyle
      active={isInProgress}
      activeSlow={isQueued}
      backgroundGradient={!downstreamBlocks?.length && getGradientColorForBlockType(type)}
      borderColorBottom={borderColorBottom}
      borderColorLeft={borderColorLeft}
      borderColorRight={borderColorRight}
      borderColorTop={borderColorTop}
      borderDeemphasized={downstreamBlocks?.length >= 1}
      borderRadiusLarge={downstreamBlocks?.length >= 1}
      disabled={disabled}
      height={height}
      isCancelled={isCancelled}
      isDragging={isDragging}
      noBackground={downstreamBlocks?.length >= 1}
      opacity={opacity}
      selected={selected}
    >
      <NodeStyle
        disabled={disabled}
        height={height - (BORDER_WIDTH * 2)}
        isConditionFailed={isConditionFailed}
        noBackground={downstreamBlocks?.length >= 1}
      >
        {!downstreamBlocks?.length && (
          <HeaderStyle>
            <FlexContainer alignItems="center" justifyContent="space-between">
              <Flex flex={1}>
                {iconEl}

                <Spacing mr={HEADER_SPACING_HORIZONTAL_UNITS} />

                <Flex flexDirection="column">
                  <Text bold monospace>
                    {getBlockHeaderText(block, pipeline)}
                  </Text>
                  <Text default monospace small>
                    {getBlockHeaderSubtitle(block, pipeline)}
                  </Text>
                </Flex>
              </Flex>

              <Spacing mr="15px" />

              <StatusStyle title={tooltipText}>
                {!hideStatus && (
                  <>
                    {success && <Check size={STATUS_SIZE} success />}
                    {failed && <Close danger size={STATUS_SIZE} />}
                    {noStatus && !hideNoStatus && (
                      <Circle
                        borderSize={1}
                        muted
                        size={STATUS_SIZE}
                      />
                    )}
                  </>
                )}
              </StatusStyle>
            </FlexContainer>
          </HeaderStyle>
        )}

        <BodyStyle>
          {!downstreamBlocks?.length && (
            <>
              {tagsText?.length >= 1 && (
                <Spacing mt={1}>
                  <Text default monospace small>
                    {tagsText}
                  </Text>
                </Spacing>
              )}

              {/* This is in a specific order */}
              {[
                conditionalBlocks,
                callbackBlocks,
                extensionBlocks,
              ].map((blocks, idx) => {
                if (blocks?.length >= 1) {
                  return (
                    <div key={`badge-blocks-${idx}`} style={{ marginTop: 4 }}>
                      <FlexContainer alignItems="center" flexWrap="wrap">
                        {blocks.reduce((acc, b, idx) => {
                          if (idx >= 1) {
                            acc.push(
                              <div key={`space-${b.uuid}`} style={{ width: 4 }} />,
                            );
                          }

                          acc.push(
                            <div key={`badge-${b.uuid}`} style={{ marginTop: 4 }}>
                              <Badge
                                color={getColorsForBlockType(
                                  b.type,
                                  {
                                    blockColor: b.color,
                                    theme: themeContext,
                                  },
                                ).accentLight}
                                monospace
                                small
                              >
                                {b.uuid}
                              </Badge>
                            </div>,
                          );

                          return acc;
                        }, [])}
                      </FlexContainer>
                    </div>
                  );
                }

                return;
              })}

              {(runtimeFromBlock || runtimeFromBlockRun) && (
                <Spacing mt={1}>
                  <Text
                    monospace
                    muted
                    small
                  >
                    {getRuntimeText(runtimeFromBlock || runtimeFromBlockRun)}
                  </Text>
                </Spacing>
              )}
            </>
          )}

          {children}
        </BodyStyle>
      </NodeStyle>
    </NodeContainerStyle>
  );
}

export default BlockNode;
