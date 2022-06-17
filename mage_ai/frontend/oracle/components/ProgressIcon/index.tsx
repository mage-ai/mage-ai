import styled from 'styled-components';

import Button from '@oracle/elements/Button';
import Text from '@oracle/elements/Text';
import { ArrowDown, ArrowUp } from '@oracle/icons';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR } from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';

export type ProgressIconProps = {
  percentage?: number;
  danger?: boolean;
};

const ProgressIconStyle = styled.p<ProgressIconProps>`a
  border-radius: ${BORDER_RADIUS_SMALL}px;
  display: inline;
  font-family: ${MONO_FONT_FAMILY_REGULAR};
  font-size: ${REGULAR};
  margin: 0;
`;

const ICON_SIZE = UNIT * 2;

const ProgressIcon = ({
  ...props
}: ProgressIconProps) => (
  <ProgressIconStyle>
    {props.danger
      ?
        <Button
          afterIcon={<ArrowDown negative size={ICON_SIZE}/>}
          danger
          padding="2px 6px"
        >
          <Text danger>
            {props.percentage}%
          </Text>
        </Button>
      :
        <Button
          afterIcon={<ArrowUp positive size={ICON_SIZE} />}
          padding="2px 6px"
          success
        >
          <Text positive>
            {props.percentage}%
          </Text>
        </Button>
    }
  </ProgressIconStyle>
);

export default ProgressIcon;
