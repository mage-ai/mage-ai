import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

type ContainerProps = {
  width?: number;
};

export const ContainerStyle = styled.div<ContainerProps>`
  ${props => !props.width && `
    width: ${40 * UNIT}px;
  `}

  ${props => props.width && `
    width: ${props.width}px;
  `}
`;

export const HeaderStyle = styled.div`
  padding: ${2.5 * UNIT}px;

  ${(props: any) => `
    background-color: ${(props.theme.background || dark.background).dashboard};
    border-left: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
    border-right: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
    border-top-left-radius: ${BORDER_RADIUS}px;
    border-top-right-radius: ${BORDER_RADIUS}px;
    border-top: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}
`;

export const RowStyle = styled.div<{
  display?: string;
  paddingVerticalAddition?: number;
}>`
  align-items: center;
  justify-content: space-between;

  ${(props: any) => `
    background-color: ${(props.theme.background || dark.background).dashboard};
    border-left: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
    border-right: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
    border-top: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
    display: ${props?.display || 'flex'};
    padding-bottom: ${1 * UNIT + (props?.paddingVerticalAddition || 0)}px;
    padding-left: ${PADDING_UNITS * UNIT}px;
    padding-top: ${1 * UNIT + (props?.paddingVerticalAddition || 0)}px;
  `}
`;

export const FooterStyle = styled.div`
  padding: ${2.5 * UNIT}px ${2 * UNIT}px;

  ${(props: any) => `
    background-color: ${(props.theme.background || dark.background).panel};
    border-bottom-left-radius: ${BORDER_RADIUS}px;
    border-bottom-right-radius: ${BORDER_RADIUS}px;
    border-bottom: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
    border-left: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
    border-right: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}
`;
