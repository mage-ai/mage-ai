import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';

const PageSectionHeader = styled.div<{
  backgroundColor?: string;
}>`
  left: 0;
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 3;

  ${props => `
    background-color: ${props.backgroundColor || (props.theme.background || dark.background).page};
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;

export default PageSectionHeader;
