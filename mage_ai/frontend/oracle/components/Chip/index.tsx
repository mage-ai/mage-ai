import styled from 'styled-components';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { Close } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  REGULAR_LINE_HEIGHT,
  SMALL_LINE_HEIGHT,
} from '@oracle/styles/fonts/sizes';

export type ChipProps = {
  children?: any;
  label?: string | any;
  onClick?: () => void;
  small?: boolean;
};

const ChipStyle = styled.div<ChipProps>`
  display: inline-block;

  ${props => `
    background-color: ${(props.theme.background || dark.background).popup};
  `}

  ${props => !props.small && `
    border-radius: ${(UNIT + SMALL_LINE_HEIGHT) / 2}px;
    height: ${(UNIT * 1.5) + SMALL_LINE_HEIGHT}px;
    padding: ${UNIT / 1.5}px ${UNIT * 1.25}px;
  `}

  ${props => props.small && `
    border-radius: ${((UNIT / 2) + SMALL_LINE_HEIGHT) / 2}px;
    height: ${SMALL_LINE_HEIGHT + (UNIT / 2)}px;
    padding: ${UNIT / 4}px ${UNIT}px;
  `}
`;

const Chip = ({
  children,
  label,
  onClick,
  small,
}: ChipProps) => (
  <ChipStyle small={small}>
    <Button
      basic
      noPadding
      noBackground
      onClick={onClick}
      transparent
    >
      <FlexContainer alignItems="center">
        {children}
        {label && (
          <Text small={small}>
            {label}
          </Text>
        )}
        <Spacing mr={1} />
        <Close muted size={small ? UNIT : UNIT * 1.25} />
      </FlexContainer>
    </Button>
  </ChipStyle>
);

export default Chip;
