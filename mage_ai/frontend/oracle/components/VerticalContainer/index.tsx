import styled from 'styled-components';

type VerticalContainerProps = {
  children: any;
  height?: number;
  overflow?: string;
  percentage?: number;
};

const Container = styled.div<VerticalContainerProps>`
  ${(props) => props.overflow && `
    overflow: ${props.overflow};
  `}

  ${(props) => props.height && `
    height: ${props.height}px;
  `}

  ${(props) => props.percentage && `
    min-height: ${props.percentage}vh;
  `}
`;

function VerticalContainer({ children, ...props }: VerticalContainerProps) {
  return (
    <Container
      {...props}
    >
      {children}
    </Container>
  );
}

export default VerticalContainer;
