import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { CommandCenterItemType, CommandCenterTypeEnum } from '@interfaces/CommandCenterType';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { transition } from '@oracle/styles/mixins';

export function getIconColor(item: CommandCenterItemType, opts?: {
  theme?: ThemeType;
} = {}): {
  accent?: string;
  accentLight?: string;
} {
  const theme = opts?.theme;

  const itemType = item?.type;

  let accent = (theme || dark).monotone.gray;
  let accentLight = (theme || dark).monotone.grey500;

  if (CommandCenterTypeEnum.ACTION == itemType) {
    accent = (theme || dark).accent.negative;
    accentLight = (theme || dark).accent.negativeTransparent;
  } else if (CommandCenterTypeEnum.APPLICATION == itemType) {
    accent = (theme || dark).accent.warning;
    accentLight = (theme || dark).accent.warningTransparent;
  } else if (CommandCenterTypeEnum.BLOCK == itemType) {
    return getColorsForBlockType(item?.metadata?.block?.type, {
      theme,
    });
  } else if (CommandCenterTypeEnum.FILE == itemType) {
    accent = (theme || dark).accent.sky;
    accentLight = (theme || dark).accent.skyLight;
  } else if (CommandCenterTypeEnum.PIPELINE == itemType) {
    accent = (theme || dark).accent.cyan;
    accentLight = (theme || dark).accent.cyanLight;
  } else if (CommandCenterTypeEnum.TRIGGER == itemType) {
    accent = (theme || dark).accent.rose;
    accentLight = (theme || dark).accent.roseLight;
  }

  return {
    accent,
    accentLight,
  };
}

export const ItemStyle = styled.div<{
  focused?: boolean;
}>`
  border-radius: ${BORDER_RADIUS}px;
  cursor: pointer;
  padding: ${1.5 * UNIT}px;

  ${props => `
    &:hover {
      background-color: ${(props.theme || dark).interactive.defaultBackgroundTransparent};
    }
  `}

  ${props => props.focused && `
    background-color: ${(props.theme || dark).interactive.hoverBackgroundTransparent};

    &:hover {
      background-color: ${(props.theme || dark).interactive.hoverBackgroundTransparent};
    }
  `}
`;
