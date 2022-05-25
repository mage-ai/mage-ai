import styled, { css } from 'styled-components';

import light from '@oracle/styles/themes/light';
import {
  BORDER_WIDTH,
  BORDER_STYLE,
  BORDER_RADIUS,
} from '@oracle/styles/units/borders';
import { RowCardProps } from '@oracle/components/RowCard';
import { UNIT } from '@oracle/styles/units/spacing';

export const PADDING_SIZE = UNIT * 1.75;
export const SCROLL_PADDING_SIZE = 3;
export const ROW_PADDING_HORIZONTAL_UNITS = 2;

type RowContainerStyleProps = {
  minHeight?: number;
  scrollable?: boolean;
};

type RowStyleProps = Pick<RowCardProps, 'last' | 'secondary'>;

export const RowContainerStyle = styled.div<RowContainerStyleProps>`
  border-bottom-left-radius: ${BORDER_RADIUS}px;
  border-bottom-right-radius: ${BORDER_RADIUS}px;
  margin-bottom: ${PADDING_SIZE}px;

  ${props => `
    background-color: ${(props.theme.background || light.background).page};
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme.interactive || light.interactive).defaultBorder};
    border-top: none;
  `}

  ${props => props.minHeight > 0 && `
    min-height: ${props.minHeight}px;
  `}

  ${props => props.scrollable && `
    margin-bottom: ${UNIT}px;  
    overflow-y: auto; 
    padding-top: ${SCROLL_PADDING_SIZE}px;
    padding-left: ${SCROLL_PADDING_SIZE}px;
    padding-right: ${SCROLL_PADDING_SIZE}px;
  `}
`;

export const TitleStyle = styled.div`
  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;
  padding: ${PADDING_SIZE}px ${ROW_PADDING_HORIZONTAL_UNITS * UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || light.background).header};
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme.interactive || light.interactive).defaultBorder};
  `}
`;

export const RowStyle = styled.div<RowStyleProps>`
  padding: ${PADDING_SIZE}px ${ROW_PADDING_HORIZONTAL_UNITS * UNIT}px;

  ${props => !props.secondary && `
    background-color: ${(props.theme.background || light.background).page};
  `}

  ${props => props.secondary && `
    background-color: ${(props.theme.background || light.background).row};
  `}

  ${props => props.last && `
    border-bottom-left-radius: ${BORDER_RADIUS}px;
    border-bottom-right-radius: ${BORDER_RADIUS}px;
  `}
`;
