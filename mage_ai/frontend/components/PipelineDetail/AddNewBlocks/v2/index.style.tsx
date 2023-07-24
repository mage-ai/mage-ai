import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

export const ICON_SIZE = PADDING_UNITS * UNIT;

type IconContainerProps = {
  blue?: boolean;
  border?: boolean;
  compact?: boolean;
  grey?: boolean;
  purple?: boolean;
  rose?: boolean;
  sky?: boolean;
  teal?: boolean;
  yellow?: boolean;
};

export const ContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  padding: ${2.5 * UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).dashboard};
    border: 1px solid ${(props.theme.interactive || dark.interactive).defaultBorder};
    box-shadow: ${(props.theme.shadow || dark.shadow).frame};
  `}
`;

export const DividerStyle = styled.div`
  height: ${ICON_SIZE}px;
  width: 1px;

  ${props => `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}
`;
