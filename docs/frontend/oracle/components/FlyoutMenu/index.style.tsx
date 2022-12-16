import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

type LinkProps = {
  alternateBackground?: boolean;
  disabled?: boolean;
  highlighted: boolean;
  indent?: boolean;
  largePadding?: boolean;
};

export const FlyoutMenuContainerStyle = styled.div<any>`
  position: absolute;
  max-height: ${UNIT * 58}px;

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

  ${props => props.roundedStyle && `
    border-radius: ${BORDER_RADIUS}px;

    div:first-child {
      border-top-left-radius: ${BORDER_RADIUS}px;
      border-top-right-radius: ${BORDER_RADIUS}px;
    }

    div:last-child {
      border-bottom-left-radius: ${BORDER_RADIUS}px;
      border-bottom-right-radius: ${BORDER_RADIUS}px;
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
  justify-content: space-between;
  padding: ${UNIT}px;

  ${props => props.largePadding && `
    padding: ${UNIT * 2}px;
    padding-right: ${UNIT * 6}px;
  `}

  ${props => !props.disabled && `  
    &:hover {
      cursor: default;
      background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
    }
  `}

  ${props => `
    background-color: ${(props.theme.background || dark.background).popup};
  `}

  ${props => props.alternateBackground && `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBackground};
  `}

  ${props => props.disabled && `
    color: ${(props.theme.content || dark.content).disabled};
    cursor: not-allowed;

    &:hover {
      color: ${(props.theme.content || dark.content).disabled};
    }
  `}

  ${props => props.indent && `
    padding-left: ${UNIT * 2}px;
  `}

  ${props => props.highlighted && `
    background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
  `}
`;
