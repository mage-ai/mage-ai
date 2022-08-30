import styled from 'styled-components';

type GradientTextProps = {
  backgroundGradient?: string;
  children: any;
  color?: string;
  startingOpacity?: number;
};

const SpanStyle = styled.span<{
  backgroundGradient?: string;
  color?: string;
  startingOpacity?: number;
}>`
  ${props => props.backgroundGradient && `
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent;
    background: ${props.backgroundGradient};
    background-clip: text;
    display: inline-block;
  `}

  ${props => typeof props.startingOpacity !== 'undefined' && `
    opacity: ${props.startingOpacity};
  `}

  ${props => props.color && `
    color: ${props.color} !important;
  `}
`;

function GradientText({
  backgroundGradient,
  children,
  color,
  startingOpacity,
}: GradientTextProps) {
  return (
    <SpanStyle
      backgroundGradient={backgroundGradient}
      color={color}
      startingOpacity={startingOpacity}
    >
      {children}
    </SpanStyle>
  );
}

export default GradientText;
