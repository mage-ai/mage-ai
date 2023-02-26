import styled from 'styled-components';

import Button, { ButtonProps } from '@oracle/elements/Button';
import Spacing from '@oracle/elements/Spacing';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { FIRE_PRIMARY } from '@oracle/styles/colors/gradients';
import { UNIT } from '@oracle/styles/units/spacing';

type GradientButtonProps = {
  backgroundGradient?: string;
  backgroundPanel?: boolean;
  borderWidth?: number;
  children: any;
  paddingUnits?: number;
  paddingUnitsHorizontal?: number;
  paddingUnitsVertical?: number;
} & ButtonProps;

const ButtonContentStyle = styled.div<{
  backgroundPanel?: boolean;
}>`
  border-radius: ${BORDER_RADIUS}px;
  height: fit-content;

  ${props => !props.backgroundPanel && `
    background-color: ${(props.theme.background || dark.background).page};
  `}

  ${props => props.backgroundPanel && `
    background-color: ${(props.theme.background || dark.background).panel};
  `}
`;

function GradientButton({
  backgroundGradient = FIRE_PRIMARY,
  backgroundPanel,
  borderWidth = 1,
  children,
  compact,
  paddingUnits,
  paddingUnitsHorizontal: paddingUnitsHorizontalProp = 1.5,
  paddingUnitsVertical: paddingUnitsVerticalProp = 1.25,
  ...props
}: GradientButtonProps) {
  let paddingUnitsHorizontal = paddingUnitsHorizontalProp;
  let paddingUnitsVertical = paddingUnitsVerticalProp;
  if (paddingUnits) {
    paddingUnitsHorizontal = paddingUnits;
    paddingUnitsVertical = paddingUnits;
  }

  if (compact) {
    paddingUnitsHorizontal *= 0.75;
    paddingUnitsVertical *= 0.75;
  }

  return (
    <Button
      {...props}
      backgroundGradient={backgroundGradient}
      noPadding
      padding={`${borderWidth}px`}
      pointerEventsEnabled
    >
      <ButtonContentStyle
        backgroundPanel={backgroundPanel}
      >
        <div
          style={{
            paddingBottom: (paddingUnitsVertical * UNIT) - borderWidth,
            paddingLeft: (paddingUnitsHorizontal * UNIT) - borderWidth,
            paddingRight: (paddingUnitsHorizontal * UNIT) - borderWidth,
            paddingTop: (paddingUnitsVertical * UNIT) - borderWidth,
          }}
        >
          {children}
        </div>
      </ButtonContentStyle>
    </Button>
  );
}

export default GradientButton;
