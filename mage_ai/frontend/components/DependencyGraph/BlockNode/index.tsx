import { ThemeContext } from 'styled-components';
import { useContext, useMemo } from 'react';

import Badge from '@oracle/components/Badge';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Circle from '@oracle/elements/Circle';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
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
  ICON_SIZE,
  BodyStyle,
  HeaderStyle,
  IconStyle,
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
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getRuntimeText } from '../utils';

const ICON_MAPPING = {
  [BlockTypeEnum.DATA_EXPORTER]: CircleWithArrowUp,
  [BlockTypeEnum.DATA_LOADER]: CubeWithArrowDown,
  [BlockTypeEnum.DBT]: DBTIcon,
  [BlockTypeEnum.GLOBAL_DATA_PRODUCT]: HexagonAll,
  [BlockTypeEnum.SENSOR]: Sensor,
  [BlockTypeEnum.TRANSFORMER]: FrameBoxSelection,
};

type BlockNodeProps = {
  block: BlockType;
  callbackBlocks?: BlockType[];
  conditionalBlocks?: BlockType[];
  disabled?: boolean;
  extensionBlocks?: BlockType[];
  hasFailed?: boolean;
  height: number;
  hideStatus?: boolean;
  isCancelled?: boolean;
  isConditionFailed?: boolean;
  isInProgress?: boolean;
  isQueued?: boolean;
  isSuccessful?: boolean;
  pipeline: PipelineType;
  runtime?: number;
  selected?: boolean;
};

function BlockNode({
  block,
  callbackBlocks,
  conditionalBlocks,
  disabled,
  extensionBlocks,
  height,
  hideStatus,
  pipeline,
  selected,
  hasFailed,
  isCancelled,
  isConditionFailed,
  isInProgress,
  isQueued,
  isSuccessful,
  runtime: runtimeFromBlockRun,
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
  } = block;
  const {
    accent,
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

  return (
    <NodeStyle
      borderColor={accent}
      disabled={disabled}
      height={height}
      isCancelled={isCancelled}
      isConditionFailed={isConditionFailed}
      selected={selected}
    >
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
                {isInProgress && <Spinner color={(themeContext || dark).content.active} small />}
                {success && <Check size={STATUS_SIZE} success />}
                {failed && <Close danger size={STATUS_SIZE} />}
                {noStatus && (
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

      <BodyStyle>
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
      </BodyStyle>
    </NodeStyle>
  );
}

export default BlockNode;
