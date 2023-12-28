import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

type ContainerProps = {
  noBorder?: boolean;
  shadow?: boolean;
};

export const ContainerStyle = styled.div<ContainerProps>`
  ${(props: any) => !props.noBorder && `
    border-radius: ${BORDER_RADIUS}px;
    border: 1px solid ${(props.theme.brand || dark.brand).water300};
  `}

  ${props => `
    background-color: ${(props.theme.monotone || dark.monotone).white};
  `}

  ${props => props.shadow && `
    box-shadow: ${(props.theme.shadow || dark.shadow).popup};
  `}
`;

type OptionProps = {
  selected?: boolean;
};

export const OptionStyle = styled.div<OptionProps>`
  ${transition()}

  border-radius: ${BORDER_RADIUS_SMALL}px;
  padding: ${UNIT * 0.5}px;

  ${props => `
    border: 1px solid ${(props.theme.monotone || dark.monotone).grey200};

    &:hover {
      background-color: ${(props.theme.monotone || dark.monotone).grey100};
    }
  `}

  ${props => props.selected && `
    border-color: ${(props.theme.brand || dark.brand).earth500};
  `}
`;
