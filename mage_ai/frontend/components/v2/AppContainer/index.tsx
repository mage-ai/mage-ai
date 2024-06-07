import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRef, useContext, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

import Button from '@mana/elements/Button';
import CellItem from './Cell';
import Grid, { Cell } from '@mana/components/Grid';
import Section from '@mana/elements/Section';
import TextInput from '@mana/elements/Input/TextInput';
import { ContainerStyled } from './index.style';
import { Row, Col } from '@mana/components/Container';
import { randomSimpleHashGenerator } from '@utils/string';

function GridContainer() {
  const themeContext = useContext(ThemeContext);

  const containerRef = useRef(null);
  const refApps = useRef({});
  const refItems = useRef({});
  const refRoots = useRef({});

  function startApp(uuid: string, row?: number, column?: number) {
    refApps.current[uuid] = { column, row, uuid };
    containerRef.current.appendChild(Cell({ column, row, uuid }));
    setTimeout(() => {
      const parentNode = document.getElementById(uuid);
      if (parentNode && !refRoots.current[uuid]) {
        refRoots.current[uuid] = createRoot(parentNode as HTMLElement);
        const ref = createRef() as React.Ref<HTMLDivElement>;
        refItems.current[uuid] = ref;
        refRoots.current[uuid].render(
          <ThemeProvider theme={themeContext}>
            <CellItem
              column={column}
              onAdd={(row: number, column?: number) => startApp(
                randomSimpleHashGenerator(),
                row,
                column,
              )}
              onRemove={() => removeApp(uuid)}
              ref={ref}
              row={row}
              uuid={uuid}
            />
          </ThemeProvider>,
        );
      }
    }, 0);
  }

  function removeApp(uuid: string) {
    if (refRoots?.current?.[uuid]) {
      refRoots.current[uuid].unmount();
      const parentNode = document.getElementById(uuid);
      parentNode.remove();
      delete refRoots.current[uuid];
    }
    if (refItems?.current?.[uuid]) {
      delete refItems.current[uuid];
    }
  }

  useEffect(() => {
    if (containerRef?.current && !Object.keys(refApps?.current || {})?.length) {
      [
        randomSimpleHashGenerator(),
      ].forEach((uuid: string, idx: number) => {
        startApp(uuid, Math.floor(idx / 2), idx % 2);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ContainerStyled>
      <Grid
        height="inherit"
        justifyItems="stretch"
        pad
      >
        <div>
          <Section>
            <Row align="center" justify="start">
              <Col xs="content">
                <Button
                onClick={() => {
                  startApp(`grid-item-${randomSimpleHashGenerator()}`);
                }}
                secondary
              >
                  Add app{refApps.current.length > 1 ? ` (${refApps.current.length})` : ''}
                </Button>
              </Col>
              <Col>
                <Row>
                  <Col>
                    <TextInput
                    monospace
                    number
                    onChange={() => {

                    }}
                    placeholder="Row"
                  />
                  </Col>
                  <Col>
                    <TextInput
                    monospace
                    number
                    onChange={() => {

                    }}
                    placeholder="Column"
                  />
                  </Col>
                </Row>
              </Col>
            </Row>
          </Section>
        </div>

        <Grid
          ref={containerRef}
        />
      </Grid>
    </ContainerStyled>
  );
}

export default GridContainer;
