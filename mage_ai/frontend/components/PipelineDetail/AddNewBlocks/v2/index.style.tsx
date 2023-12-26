import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { transition } from '@oracle/styles/mixins';

export const ICON_SIZE = PADDING_UNITS * UNIT;

export const ContainerStyle = styled.div<{
  focused?: boolean;
  compact?: boolean;
}>`
  ${transition()}

  border-radius: ${BORDER_RADIUS}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).dashboard};
    box-shadow: ${(props.theme.shadow || dark.shadow).frame};
  `}

  ${props => !props.focused && `
    border: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}

  ${props => props.focused && `
    border: 1px solid ${(props.theme.interactive || dark.interactive).hoverBorder};
  `}

  ${props => !props.compact && `
    padding-left: ${2.5 * UNIT}px;
    padding-right: ${2.5 * UNIT}px;
  `}

  ${props => props.compact && `
    padding-left: ${1.5 * UNIT}px;
    padding-right: ${1.5 * UNIT}px;
  `}
`;

export const DividerStyle = styled.div`
  height: ${ICON_SIZE}px;
  width: 1px;

  ${props => `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}
`;

export const ButtonWrapper = styled.div<{
  compact?: boolean;
  increasedZIndex?: boolean;
}>`
  position: relative;

  ${props => props.increasedZIndex && `
    z-index: 3;
  `}

  ${props => !props.compact && `
    margin-bottom: ${2.5 * UNIT}px;
    margin-top: ${2.5 * UNIT}px;
  `}

  ${props => props.compact && `
    margin-bottom: ${1.5 * UNIT}px;
    margin-top: ${1.5 * UNIT}px;
  `}
`;

export const TextInputFocusAreaStyle = styled.div<{
  compact?: boolean;
}>`
  width: 100%;

  &:hover {
    cursor: text;
  }

  ${props => !props.compact && `
    height: ${2.5 * UNIT}px;
  `}

  ${props => props.compact && `
    height: ${1.5 * UNIT}px;
  `}
`;

export const SearchStyle = styled.div`
  position: relative;
  width: 100%;
`;

export const DropdownStyle = styled.div<{
  maxHeight?: number;
  topOffset?: number;
  width?: string;
}>`
  ${ScrollbarStyledCss}

  border-radius: ${BORDER_RADIUS_SMALL}px;
  overflow: auto;
  position: absolute;
  z-index: 5;

  ${props => `
    background-color: ${(props.theme.background || dark.background).popup};
    box-shadow: ${(props.theme.shadow || dark.shadow).window};
    max-height: ${props?.maxHeight || UNIT * 40}px;
    width: ${props.width || '100%'};
  `}

  ${props => props.topOffset && `
    top: ${props.topOffset}px;
  `}
`;

export const RowStyle = styled.div<{
  highlighted?: boolean;
}>`
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: ${UNIT * 1.5}px ${UNIT * 2.5}px;
  position: relative;
  z-index: 2;

  &:hover {
    cursor: pointer;
  }

  ${props => props.highlighted && `
    background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
  `}
`;
