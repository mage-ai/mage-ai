import React from 'react';

import borders from '../../styles/borders';
import styled from 'styled-components';
import { UNIT } from '../../spaces';
import Grid from '../../Grid';

type GroupStyleProps = {
  itemsContained?: boolean;
};

const GroupStyled = styled.div<GroupStyleProps>`
  ${({ itemsContained }) => (itemsContained ? borders : '')}
  ${({ itemsContained, theme }) =>
    itemsContained &&
    `
      padding: ${theme.buttons.padding.sm};
    `}
`;

function Group({ children, itemsContained }: { children: React.ReactNode } & GroupStyleProps) {
  return (
    <GroupStyled itemsContained={itemsContained}>
      <Grid
        alignItems="center"
        autoFlow="column"
        columnGap={itemsContained ? UNIT * 4 : UNIT * 2}
        height="100%"
        justifyContent="start"
        style={{ overflow: 'visible' }}
        templateColumns="min-content"
        templateRows="1fr"
      >
        {React.Children.map(children, (child, index: number) => (
          <div className="button-item" key={`button-item-${index}`} style={{ height: 'inherit' }}>
            {child}
          </div>
        ))}
      </Grid>
    </GroupStyled>
  );
}

export default Group;
