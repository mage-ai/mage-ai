import { ThemeContext } from 'styled-components';
import { useContext } from 'react';

import Badge from '@oracle/components/Badge';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import { Check, Close } from '@oracle/icons';
import {
  INVERTED_TEXT_COLOR_BLOCK_COLORS,
  INVERTED_TEXT_COLOR_BLOCK_TYPES,
} from './constants';
import { NodeStyle, RuntimeStyle } from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { buildTags } from '@components/CodeBlock/utils';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getModelAttributes } from '@utils/models/dbt';
import { getRuntimeText } from './utils';

type GraphNodeProps = {
  block: BlockType;
  bodyText?: string;
  children?: any;
  disabled?: boolean;
  hasFailed?: boolean;
  height?: number;
  hideStatus?: boolean;
  isCancelled?: boolean;
  isConditionFailed?: boolean;
  isInProgress?: boolean;
  isQueued?: boolean;
  isSuccessful?: boolean;
  kicker?: string;
  onClick?: (block: BlockType) => void;
  runtime?: number;
  selected?: boolean;
  subtitle?: string;
};

function GraphNode({
  block,
  bodyText,
  children,
  disabled,
  hasFailed,
  height,
  hideStatus,
  isCancelled,
  isConditionFailed,
  isInProgress,
  isQueued,
  isSuccessful,
  kicker: kickerProp,
  onClick,
  runtime,
  selected,
  subtitle: subtitleProp,
}: GraphNodeProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const {
    color,
    type,
    uuid,
  } = block;
  const tags = buildTags(
    block,
    { conditionFailed: isConditionFailed },
  );

  const noStatus = !(
    isInProgress ||
    isQueued ||
    hasFailed ||
    isSuccessful ||
    isCancelled ||
    isConditionFailed
  );
  const success = isSuccessful && !(isInProgress || isQueued);
  const failed = hasFailed && !(isInProgress || isQueued);
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

  const inverted = INVERTED_TEXT_COLOR_BLOCK_TYPES.includes(type)
    || INVERTED_TEXT_COLOR_BLOCK_COLORS.includes(color);

  let kicker = kickerProp;
  let subtitle = subtitleProp;

  if (BlockTypeEnum.DBT === type && !kicker) {
    const {
      project,
    } = getModelAttributes(block);
    kicker = project;
  }

  return (
    <NodeStyle
      backgroundColor={getColorsForBlockType(
        type,
        { blockColor: color, theme: themeContext },
      ).accent}
      disabled={disabled}
      height={height}
      isCancelled={isCancelled}
      isConditionFailed={isConditionFailed}
      key={uuid}
      selected={selected}
    >
      <FlexContainer
        alignItems="center"
        fullHeight
      >
        {runtime && (
          <RuntimeStyle
            backgroundColor={getColorsForBlockType(
              type,
              { blockColor: color, theme: themeContext },
            ).accent}
          >
            <FlexContainer justifyContent="center">
              <Text
                inverted={INVERTED_TEXT_COLOR_BLOCK_TYPES.includes(type)
                  || INVERTED_TEXT_COLOR_BLOCK_COLORS.includes(color)}
                xsmall
              >
                {getRuntimeText(runtime)}
              </Text>
            </FlexContainer>
          </RuntimeStyle>
        )}
        {!runtime && (
          <Spacing ml={2} />
        )}

        {!hideStatus && (
          <>
            <FlexContainer
              alignItems="center"
              justifyContent="center"
              style={{
                height: UNIT * 2,
                width: UNIT * 2,
              }}
              title={tooltipText}
            >
              {isInProgress && (
                <Spinner
                  color={(themeContext || dark).content.active}
                  small
                />
              )}
              {success && <Check size={UNIT * 2} success />}
              {failed && <Close danger size={UNIT * 1.5} />}
              {noStatus && (
                <Circle
                  borderSize={1}
                  size={UNIT * 1}
                />
              )}
            </FlexContainer>

            <Spacing ml={1} />
          </>
        )}

        <FlexContainer
          flexDirection="column"
          justifyContent="center"
          style={{
            height: '100%',
            padding: '8px 0',
          }}
        >
          {kicker && (
            <Text
              bold
              inverted={inverted}
              monospace
              xsmall
            >
              {kicker}
            </Text>
          )}
          {bodyText && (
            <Text
              inverted={inverted}
              monospace
              small
            >
              {bodyText}
            </Text>
          )}
          {children}
          {tags?.length >= 1 && (
            <FlexContainer alignItems="center">
              {tags.reduce((acc, {
                title,
              }, idx) => {
                if (idx >= 1) {
                  acc.push(
                    <div key={`space-${title}`}>
                      &nbsp;
                    </div>,
                  );
                }

                acc.push(
                  <Badge
                    inverted={!inverted}
                    key={`badge-${title}`}
                    xxsmall
                  >
                    {title}
                  </Badge>,
                );

                return acc;
              }, [])}
            </FlexContainer>
          )}
        </FlexContainer>
      </FlexContainer>
    </NodeStyle>
  );
}

export default GraphNode;
