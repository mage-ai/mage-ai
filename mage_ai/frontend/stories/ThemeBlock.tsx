import React from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { GridThemeProvider } from 'styled-bootstrap-grid';

import Divider from '../oracle/elements/Divider';
import Spacing from '../oracle/elements/Spacing';
import Text from '../oracle/elements/Text';
import light from '../oracle/styles/themes/light';
import { UNIT } from '@oracle/styles/units/spacing';
import { gridTheme, theme } from '../styles/theme';
import dark from '@oracle/styles/themes/dark';

type ContainerProps = {
  reducedPadding?: boolean;
  theme?: any;
};

const Container = styled.div<ContainerProps>`
  flex: 1;
  padding: ${UNIT * 4}px;

  ${props => props.reducedPadding && `
    padding: ${UNIT * 2.5}px;
  `}

  ${props => props.theme && `
    background-color: ${props.theme.background.row};
  `}
`;

type ThemeBlockProps = {
  children: any;
  reducedPadding?: boolean;
  title?: string;
};

const ThemeBlock = ({
  children,
  reducedPadding,
  title,
}: ThemeBlockProps) => {
  const lightEl = (
    <ThemeProvider theme={{ ...theme, ...light }}>
      <Container reducedPadding={reducedPadding}>
        <Text bold xlarge>{title || 'Light Theme'}</Text>
        <br />
        <Divider short />

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

  const darkEl = (
    <ThemeProvider theme={{ ...theme, ...dark }}>
      <Container reducedPadding={reducedPadding}>
        <Text bold xlarge>{title || 'Dark Theme'}</Text>
        <br />
        <Divider short />

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
        {darkEl}
      </>
    </GridThemeProvider>
  );
};

export default ThemeBlock;
