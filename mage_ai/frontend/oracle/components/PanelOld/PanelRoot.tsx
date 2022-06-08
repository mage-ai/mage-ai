import styled from 'styled-components';

import Spacing from '@oracle/elements/Spacing';
import light from '@oracle/styles/themes/light';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';

type PanelRootProps = {
  borderColor?: string;
  condensed?: boolean;
  fullWidth?: boolean;
  minHeight?: number;
  maxWidth?: number;
  section?: boolean;
  shadow?: boolean;
  shadowLarge?: boolean;
  shadowLight?: boolean;
  transparent?: boolean;
};

const PanelRootStyle = styled.div<PanelRootProps>`
  border-radius: ${BORDER_RADIUS}px;
  border-style: solid;
  border-width: 1px;

  ${props => `
    background-color: ${(props.theme.monotone || light.monotone).white};
  `}

  ${props => props.borderColor && `
    border-color: ${props.borderColor};
  `}

  ${props => !props.borderColor && `
    border-color: ${(props.theme.monotone || light.monotone).grey200};
  `}

  ${props => props.minHeight && `
    min-height: ${props.minHeight}px;
  `}

  ${props => props.section && `
    background-color: ${(props.theme.background || light.background).section};
  `}

  ${props => props.transparent && `
    background-color: transparent;
  `}

  ${props => props.maxWidth && `
    max-width: ${props.maxWidth}px;
  `}

  ${props => props.shadow && `
    ${(props.theme.elevation || light.elevation).shadowLarge};
  `}

  ${props => props.shadowLarge && `
    ${(props.theme.elevation || light.elevation).float};
  `}

  ${props => props.shadowLight && `
    ${(props.theme.elevation || light.elevation).shadowSmall};
  `}

  ${props => props.fullWidth && `
    width: 100%;
  `}
`;

function PanelRoot({
  children,
  condensed = false,
  minHeight,
  ...props
}: {
  children: any,
} & PanelRootProps) {
  return (
    <PanelRootStyle minHeight={minHeight} {...props}>
      <Spacing p={condensed ? 2 : 3} pb={(condensed && minHeight) && 1}>
        {children}
      </Spacing>
    </PanelRootStyle>
  );
}

export default PanelRoot;
