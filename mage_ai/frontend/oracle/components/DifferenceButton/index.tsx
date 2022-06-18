import styled from 'styled-components';

import Button from '@oracle/elements/Button';
import Text from '@oracle/elements/Text';
import { ArrowDown, ArrowUp } from '@oracle/icons';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR } from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';

export type DifferenceButtonProps = {
  danger?: boolean;
  decrease?: boolean;
  increase?: boolean;
  percentage?: number;
  success?: boolean;
};

const DifferenceButtonStyle = styled.p<DifferenceButtonProps>`
  border-radius: ${BORDER_RADIUS_SMALL}px;
  display: inline;
  font-family: ${MONO_FONT_FAMILY_REGULAR};
  font-size: ${REGULAR};
  margin: 0;
`;

const ICON_SIZE = UNIT * 2;

const DifferenceButton = ({
  ...props
}: DifferenceButtonProps) => (
  <DifferenceButtonStyle>
    {props.danger
      ?
        <Button
          afterIcon={<ArrowDown negative size={ICON_SIZE}/>}
          danger
          notClickable
          padding="2px 6px"
        >
          <Text danger>
            {props.percentage}%
          </Text>
        </Button>
      :
        <Button
          afterIcon={<ArrowUp positive size={ICON_SIZE} />}
          notClickable
          padding="2px 6px"
          success
        >
          <Text positive>
            {props.percentage}%
          </Text>
        </Button>
    }
  </DifferenceButtonStyle>
);

export default DifferenceButton;
