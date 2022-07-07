import { ThemeContext } from 'styled-components';
import { useContext } from 'react';

import BlockType, { StatusTypeEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import { Check } from '@oracle/icons';
import { INVERTED_TEXT_COLOR_BLOCK_TYPES, MIN_NODE_WIDTH } from './constants';
import { NodeStyle } from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

type GraphNodeProps = {
  block: BlockType;
  disabled?: boolean;
  isInProgress?: boolean;
  isQueued?: boolean;
  isSuccessful?: boolean;
  onClick?: (block: BlockType) => void;
  selected?: boolean;
};

function GraphNode({
  block,
  disabled,
  isInProgress,
  isQueued,
  isSuccessful,
  onClick,
  selected,
}: GraphNodeProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const {
    status,
    type,
    uuid,
  } = block;

  return (
    <NodeStyle
      backgroundColor={getColorsForBlockType(type, { theme: themeContext }).accent}
      disabled={disabled}
      key={uuid}
      selected={selected}
    >
      <Button
        basic
        disabled={disabled}
        id={uuid}
        noBackground
        noBorder
        noPadding
        onClick={(onClick && !disabled) ? () => onClick(block) : null}
      >
        <Spacing p={1}>
          <FlexContainer alignItems="center">
            <FlexContainer
              alignItems="center"
              justifyContent="center"
              style={{
                height: UNIT * 2,
                width: UNIT * 2,
              }}
            >
              {isInProgress && (
                <Spinner
                  color={(themeContext || dark).content.active}
                  small
                />
              )}
              {isSuccessful && !(isInProgress || isQueued) && <Check size={UNIT * 2} success />}
              {!(isInProgress || isQueued || isSuccessful) && (
                <Circle
                  borderSize={1}
                  size={UNIT * 1}
                />
              )}
            </FlexContainer>

            <Spacing ml={1} />

            <Text
              inverted={INVERTED_TEXT_COLOR_BLOCK_TYPES.includes(type)}
              monospace
              small
            >
              {uuid}
            </Text>
          </FlexContainer>
        </Spacing>
      </Button>
    </NodeStyle>
  );
}

export default GraphNode;
