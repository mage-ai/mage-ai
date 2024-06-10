import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRef, useContext, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import { AppSubtypeEnum, AppTypeEnum } from '@components/v2/Apps/constants';
import { randomSimpleHashGenerator } from '@utils/string';
import AppContainer from '@components/v2/AppContainer';
import Button, { ButtonGroup } from '@mana/elements/Button';
import Grid, { Col as GridCol, Row as GridRow } from '@mana/components/Grid';
import Section from '@mana/elements/Section';
import TextInput from '@mana/elements/Input/TextInput';
import icons from '@mana/icons';
import { AppConfigType } from '@components/v2/Apps/interfaces';
import { ContainerStyled } from './index.style';
import { ModeEnum } from '@mana/themes/modes';
import { Row, Col } from '@mana/components/Container';
import { removeClassNames } from '@utils/elements';
import { setThemeSettings } from '@mana/themes/utils';
import { WithOnMount } from '@mana/hooks/useWithOnMount';

const { Cluster, Dark } = icons;

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
        removeClassNames(containerRef?.current?.className, cn =>
          cn.startsWith('grid-template-columns-'),
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

  function addPanel(uuid: string, apps?: AppConfigType[]) {
    const container = document.getElementById(uuid);
    if (container) {
      container.remove();
    }

    containerRef?.current.appendChild(GridCol({ uuid }));

    apps?.forEach((app: AppConfigType, idx: number) => {
      setTimeout(() => {
        const parentNode = document.getElementById(uuid);

        if (parentNode && !refRoots.current[uuid]) {
          refRoots.current[uuid] = createRoot(parentNode as HTMLElement);
          const ref = createRef() as React.Ref<HTMLDivElement>;
          refCells.current[uuid] = ref;

          refRoots.current[uuid].render(
            <ThemeProvider theme={themeContext}>
              <AppContainer
                apps={[app]}
                onRemoveApp={(
                  _uuidApp,
                  appConfigs: {
                    [uuid: string]: AppConfigType;
                  },
                ) => {
                  if (!Object.keys(appConfigs || {})?.length) {
                    removePanel(uuid);
                  }
                }}
              />
            </ThemeProvider>,
          );

          updateLayout();
        }
      }, idx * 100);
    });
  }

  return (
    <WithOnMount
      onMount={() => {
        if (containerRef?.current && !Object.keys(refCells?.current || {})?.length) {
          setTimeout(() => {
            if (!Object.keys(refCells?.current || {})?.length) {
              addPanel('test-panel', [
                {
                  subtype: AppSubtypeEnum.SYSTEM,
                  type: AppTypeEnum.BROWSER,
                  uuid: 'test-app',
                },
              ]);
            }
          }, 1);
        }
      }}
    >
      <ContainerStyled>
        <Grid height='inherit' pad templateRows='auto 1fr' width='100%'>
          <GridRow row={1} width='inherit'>
            <Section>
              <Row align='center' justify='start'>
                <Col xs='content'>
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
                      <TextInput monospace number placeholder='Row' />
                    </Col>
                    <Col>
                      <TextInput monospace number placeholder='Column' />
                    </Col>
                  </Row>
                </Col>
                <Col xs='content'>
                  <ButtonGroup>
                    <Button
                      Icon={Dark}
                      onClick={() =>
                        setThemeSettings(({ mode }) => ({
                          mode: ModeEnum.LIGHT === mode ? ModeEnum.DARK : ModeEnum.LIGHT,
                        }))
                      }
                    >
                      Theme
                    </Button>

                    <Button
                      basic
                      onClick={() => {
                        addPanel(String(Number(new Date())), [
                          {
                            subtype: AppSubtypeEnum.IDE,
                            type: AppTypeEnum.EDITOR,
                            uuid: randomSimpleHashGenerator(),
                          },
                        ]);
                      }}
                    >
                      Add panel
                    </Button>
                  </ButtonGroup>
                </Col>
              </Row>
            </Section>
          </GridRow>

          <GridRow row={2} width='inherit'>
            <Grid ref={containerRef} templateRows='1fr' width='inherit' />
          </GridRow>
        </Grid>
      </ContainerStyled>
    </WithOnMount>
  );
}

export default GridContainer;
