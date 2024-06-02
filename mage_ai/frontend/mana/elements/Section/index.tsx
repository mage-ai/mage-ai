import React from 'react';
import styled from 'styled-components';
import borders from '../../styles/borders';
import padding from '../../styles/padding';

type SectionProps = {
  children: React.ReactNode;
  stretch?: boolean;
};

const SectionStyled = styled.section<SectionProps>`
  ${borders}
  ${padding}

  height: ${({ stretch }) => stretch ? '100%' : 'inerhit'};
`;

function Section({ children, ...props }: SectionProps) {
  return (
    <SectionStyled {...props}>
      {children}
    </SectionStyled>
  );
}

export default Section;
