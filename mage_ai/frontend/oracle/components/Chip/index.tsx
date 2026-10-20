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
  border?: boolean;
  children?: any;
  disabled?: boolean;
  label?: string | any;
  monospace?: boolean;
  onClick?: (e: any) => void;
  primary?: boolean;
  small?: boolean;
  xsmall?: boolean;
};

const ChipStyle = styled.div<ChipProps>`
  display: inline-block;

  ${props => !props.primary && `
    background-color: ${(props.theme.background || dark.background).tag};
  `}

  ${props => props.primary && `
    background-color: ${(props.theme.chart || dark.chart).primary};
  `}

  ${props => !props.small && `
    border-radius: ${(UNIT + SMALL_LINE_HEIGHT) / 2}px;
    height: ${(UNIT * 1.5) + SMALL_LINE_HEIGHT}px;
    padding: ${UNIT / 1.5}px ${UNIT * 1.25}px;
  `}

  ${props => props.small && `
    border-radius: ${((UNIT / 2) + SMALL_LINE_HEIGHT) / 2}px;
    height: ${SMALL_LINE_HEIGHT + (UNIT / 2) + 2}px;
    padding: ${UNIT / 4}px ${UNIT}px;
  `}

  ${props => props.xsmall && `
    border-radius: ${((UNIT / 1) + SMALL_LINE_HEIGHT) / 1}px;
    height: ${12 + 8}px;
    padding: 4px 6px;
  `}

  ${props => props.border && `
    border: 1px solid ${(props.theme.content || dark.content).muted};
  `}
`;

const Chip = ({
  border,
  children,
  disabled,
  label,
  monospace,
  onClick,
  primary,
  small,
  xsmall,
}: ChipProps) => (
  <ChipStyle border={border} primary={primary} small={small} xsmall={xsmall}>
    <Button
      basic
      disabled={disabled}
      noBackground
      noPadding
      onClick={onClick}
      transparent
    >
      <FlexContainer alignItems="center">
        {children}
        {label && (
          <Text monospace={monospace} small={small} xsmall={xsmall}>
            {label}
          </Text>
        )}
        {!disabled && onClick && <div style={{ marginLeft: 2 }} />}
        {!disabled && onClick && (
          <Close default={primary} muted={!primary} size={small ? UNIT : UNIT * 1.25} />
        )}
      </FlexContainer>
    </Button>
  </ChipStyle>
);

export default Chip;
