import React from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { GridThemeProvider } from 'styled-bootstrap-grid';

import Spacing from '../oracle/elements/Spacing';
import Text from '../oracle/elements/Text';
import light from '../oracle/styles/themes/light';
import { gridTheme, theme } from '../styles/theme';

const Container = styled.div`
  flex: 1;
  padding: 48px;

  ${props => props.theme && `
    background-color: ${props.theme.background.page};
  `}

  ${props => props.theme && props.inverted && `
    background-color: ${props.theme.background.pageInverted};
  `}
`;

type ThemeBlockProps = {
  children: any;
  title?: string;
};

const ThemeBlock = ({
  children,
  title,
}: ThemeBlockProps) => {
  const lightEl = (
    <ThemeProvider theme={{ ...theme, ...light }}>
      <Container>
        <Text bold>{title || 'Light'}</Text>
        <br />

        <Spacing mt={3}>
          {React.Children.map(children, (child, idx) => React.cloneElement(
            child,
            {
              key: idx,
            },
          ))}
        </Spacing>
      </Container>
    </ThemeProvider>
  );

  return (
    <GridThemeProvider gridTheme={gridTheme}>
      <>
        {lightEl}
      </>
    </GridThemeProvider>
  );
};

export default ThemeBlock;
