import { ThemeContext } from 'styled-components';
import { useContext } from 'react';

import BlockType from '@interfaces/BlockType';
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
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getRuntimeText } from './utils';

type GraphNodeProps = {
  block: BlockType;
  children: any;
  disabled?: boolean;
  hasFailed?: boolean;
  hideStatus?: boolean;
  isCancelled?: boolean;
  isInProgress?: boolean;
  isQueued?: boolean;
  isSuccessful?: boolean;
  onClick?: (block: BlockType) => void;
  runtime?: number;
  selected?: boolean;
};

function GraphNode({
  block,
  children,
  disabled,
  hasFailed,
  hideStatus,
  isCancelled,
  isInProgress,
  isQueued,
  isSuccessful,
  onClick,
  runtime,
  selected,
}: GraphNodeProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const {
    color,
    type,
    uuid,
  } = block;

  const noStatus = !(isInProgress || isQueued || hasFailed || isSuccessful || isCancelled);
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

  return (
    <NodeStyle
      backgroundColor={getColorsForBlockType(
        type,
        { blockColor: color, theme: themeContext },
      ).accent}
      disabled={disabled}
      isCancelled={isCancelled}
      key={uuid}
      selected={selected}
    >
      <FlexContainer alignItems="center">
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
          alignItems="center"
          justifyContent="center"
          style={{
            padding: '8px 0',
            height: '100%',
          }}
        >
          <Text
            inverted={INVERTED_TEXT_COLOR_BLOCK_TYPES.includes(type)
              || INVERTED_TEXT_COLOR_BLOCK_COLORS.includes(color)}
            monospace
            small
          >
            {children}
          </Text>
        </FlexContainer>
      </FlexContainer>
    </NodeStyle>
  );
}

export default GraphNode;
