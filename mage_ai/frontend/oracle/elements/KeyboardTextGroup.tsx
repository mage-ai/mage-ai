import styled from 'styled-components';

import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardText from '@oracle/elements/KeyboardText';
import Text from '@oracle/elements/Text';
import { UNIT } from '@oracle/styles/units/spacing';

export type NumberOrString = number | string;

const SpacingStyle = styled.div<{
  marginRight?: boolean;
  small?: boolean;
}>`
  ${props => props.small && `
    margin-left: ${UNIT * 0.25}px;
  `}

  ${props => !props.small && `
    margin-left: ${UNIT * 0.25}px;
  `}

  ${props => props.marginRight && `
    margin-right: ${UNIT * 0.25}px;
  `}
`;

export type KeyboardTextGroupProps = {
  borderless?: boolean;
  disabled?: boolean;
  keyTextGroups: NumberOrString[][];
  inline?: boolean;
  monospace?: boolean;
  mutedDisabled?: boolean;
  small?: boolean;
};

function KeyboardTextGroup({
  borderless,
  disabled,
  keyTextGroups,
  inline,
  monospace,
  mutedDisabled,
  small,
}: KeyboardTextGroupProps) {
  const els = [];

  keyTextGroups.forEach((keyTextGroup: NumberOrString[], idx1: number) => {
    const combo = [];

    keyTextGroup.forEach((keyText: NumberOrString, idx2: number) => {
      if (idx2 >= 1) {
        combo.push(<SpacingStyle key={`spacing-${keyText}`} small={small} />);
      }

      combo.push(
        <KeyboardText
          borderless={borderless}
          disabled={disabled}
          inline
          key={`key-${keyText}`}
          keyText={keyText}
          monospace={monospace}
          mutedDisabled={mutedDisabled}
        />
      );
    });

    if (idx1 >= 1) {
      els.push(
        <SpacingStyle
          key={`then-${idx1}`}
          marginRight
        >
          <Text
            monospace={monospace}
            muted
            small={!small}
            xsmall={small}
          >
            then
          </Text>
        </SpacingStyle>
      );
    }

    els.push(...combo);
  });

  return (
    <FlexContainer alignItems="center" inline={inline}>
      {els}
    </FlexContainer>
  );
}

export default KeyboardTextGroup;
