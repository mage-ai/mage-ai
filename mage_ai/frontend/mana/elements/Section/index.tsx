import React from 'react';
import styled from 'styled-components';
import borders from '../../styles/borders';
import padding from '../../styles/padding';

const SectionStyled = styled.section`
  ${borders}
  ${padding}
`;

function Section({ children }: { children: React.ReactNode }) {
  return (
    <SectionStyled>
      {children}
    </SectionStyled>
  );
}

export default Section;
