import styled from 'styled-components';

import Badge from '../Badge';
import { Check } from '@oracle/icons';
import Button from '@oracle/elements/Button';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import Spacing from '@oracle/elements/Spacing';
import FlexContainer from '@oracle/components/FlexContainer';
import Flex from '../Flex';

export type ChipProps = {
  children?: any;
  disabled?: boolean;
  onClick?: () => void;
  text?: string;
};

const ChipStyle = styled.div<ChipProps>`
  border-radius: ${BORDER_RADIUS_SMALL}px;
  display: inline-block;

  ${props => !props.disabled && `
    background-color: ${props.theme.feature.disabled};
  `}
`;

const Chip = ({
  children,
  disabled,
  ...props
}: ChipProps) => (
  <ChipStyle
    {...props}
  >
      
    <Button basic iconOnly padding="0px" transparent>
      <Badge disabled={disabled}>
        <Flex>
          {children}
          <Spacing mr={2} />
          {/* FIXME: icon is not vertically centered */}
          <Check />
        </Flex>
      </Badge>
    </Button>
      
  </ChipStyle>
);

export default Chip;