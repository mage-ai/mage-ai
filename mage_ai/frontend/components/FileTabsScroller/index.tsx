import styled from 'styled-components';

import { hideScrollBar } from '@oracle/styles/scrollbars';

const ScrollerStyle = styled.div<{
  width: string | number;
}>`
  ${hideScrollBar()}

  overflow: auto;

  ${props => `
    width: ${props.width};
  `}
`;

function FileTabsScroller({
  children,
  width,
}) {
  return (
    <ScrollerStyle>
      {children}
    </ScrollerStyle>
  );
}

export default FileTabsScroller;
