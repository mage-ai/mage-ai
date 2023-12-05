import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { BorderColorShareProps, BORDER_COLOR_SHARED_STYLES } from '@components/CodeBlock/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { transition } from '@oracle/styles/mixins';

export const MODAL_PADDING = 8 * UNIT;

export const AfterFooterStyle = styled.div`
  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
  `}
`;

export const ContainerStyle = styled.div<{
  borderColor?: string;
  noBackground?: boolean;
  noBorderRadiusBottom?: boolean;
  noBorderRadiusTop?: boolean;
} & BorderColorShareProps>`
  ${BORDER_COLOR_SHARED_STYLES}

  border-style: solid;
  border-width: 1px;
  position: relative;

  ${props => !props.noBorderRadiusTop && `
    border-top-left-radius: ${BORDER_RADIUS}px;
    border-top-right-radius: ${BORDER_RADIUS}px;
  `}

  ${props => props.noBorderRadiusTop && `
    border-top: none !important;
  `}

  ${props => !props.noBorderRadiusBottom && `
    border-bottom-left-radius: ${BORDER_RADIUS}px;
    border-bottom-right-radius: ${BORDER_RADIUS}px;
  `}

  ${props => props.noBorderRadiusBottom && `
    border-bottom: none !important;
  `}

  ${props => !props.noBackground && `
    background-color: ${(props.theme.background || dark.background).panel};
  `}

  ${props => !props.borderColor && `
    border-color: ${(props.theme.borders || dark.borders).light};
  `}

  ${props => props.borderColor && `
    border-color: ${props.borderColor};
  `}
`;

export const HeaderStyle = styled.div`
  padding: ${PADDING_UNITS * UNIT}px;

  ${props => `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).light};
  `}
`;

export const NavigationStyle = styled.div<{
  selected?: boolean;
}>`
  ${transition()}

  ${props => !props.selected && `
    &:hover {
      background-color: ${(props.theme.interactive || dark.interactive).rowHoverBackground};
    }
  `}

  ${props => props.selected && `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}
`;

export const StreamGridGroupStyle = styled.div`
  position: absolute;
`;

export const StreamGridGroupInnerStyle = styled.div<{
  borderRight?: boolean;
}>`
  ${ScrollbarStyledCss}

  overflow: auto;
  position: fixed;

  ${props => props.borderRight && `
    border-right: 1px solid ${(props.theme.borders || dark.borders).light};
  `}
`;

export const StreamGridStyle = styled.div<{
  selected?: boolean;
  warning?: boolean;
}>`
  border-radius: ${BORDER_RADIUS}px;
  padding: ${PADDING_UNITS * UNIT}px;
  margin: ${1 * UNIT}px;

  ${props => !props.warning && `
    &:hover {
      cursor: pointer;
    }
  `}

  ${props => !props.selected && !props.warning && `
    border: 1px solid ${(props.theme.borders || dark.borders).light};
  `}

  ${props => props.warning && !props.selected && `
    border: 1px solid ${(props.theme.accent || dark.accent).warningTransparent};
  `}

  ${props => props.warning && props.selected && `
    border: 1px solid ${(props.theme.accent || dark.accent).warning};
  `}

  ${props => props.selected && !props.warning && `
    background-color: ${(props.theme.background || dark.background).panel};
    border: 1px solid ${(props.theme.borders || dark.borders).contrast};
  `}
`;

export const BackgroundStyle = styled.div`
  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
  `}
`;

export const ButtonContainerStyle = styled.div<{
  width?: number;
}>`
  bottom: 0;
  position: fixed;
  z-index: 1;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
    border-left: 1px solid ${(props.theme.borders || dark.borders).light};
    border-right: 1px solid ${(props.theme.borders || dark.borders).light};
    border-top: 1px solid ${(props.theme.borders || dark.borders).light};
  `}

  ${props => props.width && `
    width: ${props.width}px;
   `}
`;
