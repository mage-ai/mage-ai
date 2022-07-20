import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { UNIT } from '@oracle/styles/units/spacing';

type LinkProps = {
  highlighted: boolean;
  indent?: boolean;
};

export const MENU_WIDTH = UNIT * 34;
export const COMPACT_MENU_WIDTH = UNIT * 20;

export const FlyoutMenuContainerStyle = styled.div<any>`
  position: absolute;
  max-height: ${UNIT * 58}px;

  ${props => !props.compact && `
    min-width: ${MENU_WIDTH}px;
  `}

  ${props => props.compact && `
    min-width: ${COMPACT_MENU_WIDTH}px;
  `}

  ${props => props.width && `
    min-width: 0px;
    width: ${props.width}px;
  `}

  ${props => `
    box-shadow: ${(props.theme.shadow || dark.shadow).popup};

    &:hover {
      background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
    }
  `}

`;

export const TitleContainerStyle = styled.div`
  padding: ${UNIT}px;
  padding-bottom: 0;

  ${props => `
    background-color: ${(props.theme.background || dark.background).popup};
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

  ${props => props.indent && `
    padding-left: ${UNIT * 2}px;
  `}

  ${props => props.highlighted && `
    background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
  `}
`;
