import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRef, useContext, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import AppContainer from '@components/v2/AppContainer';
import Button, { ButtonGroup } from '@mana/elements/Button';
import Grid, { Col as GridCol, Row as GridRow } from '@mana/components/Grid';
import Section from '@mana/elements/Section';
import TextInput from '@mana/elements/Input/TextInput';
import { AppConfig } from '@components/v2/AppContainer/interfaces';
import { Cluster, Dark } from '@mana/icons';
import { ContainerStyled } from './index.style';
import { ModeEnum } from '@mana/themes/modes';
import { Row, Col } from '@mana/components/Container';
import { removeClassNames } from '@utils/elements';
import { setThemeSettings } from '@mana/themes/utils';

function GridContainer() {
  const themeContext = useContext(ThemeContext);

  const containerRef = useRef(null);
  const refCells = useRef({});
  const refRoots = useRef({});

  function updateLayout() {
    if (containerRef?.current) {
      const columns = Object.keys(refCells?.current || {})?.length || 1;
      containerRef.current.className = [
        `grid-template-columns-${columns}`,
        removeClassNames(
          containerRef?.current?.className,
          cn => cn.startsWith('grid-template-columns-'),
        ),
      ].join(' ');
    }
  }

  function removePanel(uuid: string) {
    if (refRoots?.current?.[uuid]) {
      refRoots.current[uuid].unmount();
      const parentNode = document.getElementById(uuid);
      parentNode.remove();
      delete refRoots.current[uuid];
    }

    if (refCells?.current?.[uuid]) {
      delete refCells.current[uuid];
    }

    updateLayout();
  }

  function addPanel(config: AppConfig) {
    const { uuid } = config;
    containerRef?.current.appendChild(GridCol(config));

    setTimeout(() => {
      const parentNode = document.getElementById(uuid);

      if (parentNode && !refRoots.current[uuid]) {
        refRoots.current[uuid] = createRoot(parentNode as HTMLElement);
        const ref = createRef() as React.Ref<HTMLDivElement>;
        refCells.current[uuid] = ref;

        refRoots.current[uuid].render(
          <ThemeProvider theme={themeContext}>
            <AppContainer
              onRemoveApp={(_uuidApp, appConfigs: {
                [uuid: string]: AppConfig;
              }) => {
                if (!Object.keys(appConfigs || {})?.length) {
                  removePanel(uuid);
                }
              }}
            />
          </ThemeProvider>,
        );

        updateLayout();
      }
    }, 0);
  }

  return (
    <ContainerStyled>
      <Grid
        height="inherit"
        pad
        templateRows="auto 1fr"
      >
        <GridRow row={1}>
          <Section>
            <Row align="center" justify="start">
              <Col xs="content">
                <Button
                  Icon={Cluster}
                  onClick={() => {
                    console.log('Run pipeline');
                  }}
                  primary
                >
                  Run pipeline
                </Button>
              </Col>
              <Col>
                <Row>
                  <Col>
                    <TextInput
                      monospace
                      number
                      placeholder="Row"
                    />
                  </Col>
                  <Col>
                    <TextInput
                      monospace
                      number
                      placeholder="Column"
                    />
                  </Col>
                </Row>
              </Col>
              <Col xs="content">
                <ButtonGroup>
                  <Button
                    Icon={Dark}
                    onClick={() => setThemeSettings(({ mode }) => ({
                      mode: ModeEnum.LIGHT === mode ? ModeEnum.DARK : ModeEnum.LIGHT,
                    }))}
                  >
                    Theme
                  </Button>

                  <Button
                    basic
                    onClick={() => {
                      addPanel({ uuid: String(Number(new Date())) });
                    }}
                  >
                    Add panel
                  </Button>
                </ButtonGroup>
              </Col>
            </Row>
          </Section>
        </GridRow>

        <Grid
          ref={containerRef}
          row={2}
          uuid="app-layout"
        />
      </Grid>
    </ContainerStyled>
  );
}

export default GridContainer;
