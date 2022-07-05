import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { UNIT } from '@oracle/styles/units/spacing';

type LinkProps = {
  highlighted: boolean;
};

export const FlyoutMenuContainerStyle = styled.div`
  position: absolute;
  min-width: ${UNIT * 34}px;

  ${props => `
    box-shadow: ${(props.theme.shadow || dark.shadow).popup};

    &:hover {
      background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
    }
  `}
`;

export const LinkStyle = styled.div<LinkProps>`
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: ${UNIT}px;

  &:hover {
    cursor: default;
  }

  ${props => `
    background-color: ${(props.theme.background || dark.background).popup};

    &:hover {
      background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
    }
  `}

  ${props => props.highlighted && `
    background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
  `}
`;
