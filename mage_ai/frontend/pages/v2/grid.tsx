import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRef, forwardRef, useContext, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import Container, { Row, Col } from '@mana/components/Container';
import Grid, { Cell } from '@mana/components/Grid';
import Route from '@components/v2/Route';
import Section from '@mana/elements/Section';
import TextInput from '@mana/elements/Input/TextInput';
import Tag from '@mana/components/Tag';
import Text from '@mana/elements/Text';
import { Cluster, Settings } from '@mana/icons';
import { setThemeSettings } from '@mana/themes/utils';
import { ModeEnum } from '@mana/themes/modes';
import { randomSimpleHashGenerator } from '@utils/string';

const TXT = `I’ve found several existing blocks that can potentially be reused.
Take a look and let me know if anything works, you can also ask me to simply choose the best one.`;

function applyStyles(element: HTMLElement, styles: CSSStyleDeclaration) {
  for (const style in styles) {
    if (styles.hasOwnProperty(style) && typeof styles[style] === 'string') {
      element.style[style as any] = styles[style];
    }
  }
}

type CellProps = {
  onAdd?: () => void;
  onRemove?: () => void;
  uuid: string;
};

function CellItemBase({
  onAdd,
  onRemove,
  uuid,
}: CellProps, ref: React.Ref<HTMLDivElement>) {
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });

  return (
    <Section ref={ref}>
      <Row direction="column" nogutter>
        <Col xs="content">
          <Row>
            <Col><Text>{TXT}</Text></Col>
            <Col xs="content"><Tag>Block</Tag></Col>
          </Row>
          <Divider short />
          <Row>
            <Col><Text monospace>{TXT}</Text></Col>
          </Row>
        </Col>

        <Divider />

        <Col xs="content">
          <ButtonGroup>
            <Button
              Icon={Settings}
              onClick={() => setThemeSettings(({ mode }) => ({
                mode: ModeEnum.LIGHT === mode ? ModeEnum.DARK : ModeEnum.LIGHT,
              }))}
              primary
              small
            >
              Theme
            </Button>

            {onAdd && (
              <Button
                Icon={Cluster}
                onClick={() => onAdd()}
                secondary
                small
              >
                Add
              </Button>
            )}
            {onRemove && (
              <Button
                onClick={() => onRemove()}
                small
                tag={uuid}
              >
                Remove
              </Button>
            )}
          </ButtonGroup>
        </Col>
      </Row>
    </Section>
  );
}

const CellItem = forwardRef(CellItemBase);

function GridPage() {
  const themeContext = useContext(ThemeContext);

  const containerRef = useRef(null);
  const refApps = useRef([]);
  const refItems = useRef({});
  const refRoots = useRef({});

  function startApp(uuid: string, row?: number, column?: number) {
    const appsCount = refApps?.current?.length || 0;
    refApps.current.push({});

    if (containerRef.current) {
      containerRef.current.appendChild(Cell({
        column,
        row: typeof row === 'undefined' ? appsCount : row,
        uuid,
      }));
    }

    initializeAndRenderApp(uuid);
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

  function initializeAndRenderApp(uuid: string) {
    setTimeout(() => {
      const parentNode = document.getElementById(uuid);
      if (parentNode && !refRoots.current[uuid]) {
        refRoots.current[uuid] = createRoot(parentNode as HTMLElement);
        const ref = createRef() as React.Ref<HTMLDivElement>;
        refItems.current[uuid] = ref;
        refRoots.current[uuid].render(
          <ThemeProvider theme={themeContext}>
            <CellItem
              onAdd={() => startApp(`grid-item-${randomSimpleHashGenerator()}`)}
              onRemove={() => removeApp(uuid)}
              ref={ref}
              uuid={uuid}
            />
          </ThemeProvider>,
        );
      }
    }, 0);
  }

  useEffect(() => {
    if (containerRef?.current && !refApps?.current?.length) {
      [
        randomSimpleHashGenerator(),
        randomSimpleHashGenerator(),
        randomSimpleHashGenerator(),
        randomSimpleHashGenerator(),
      ].forEach((uuid: string, idx: number) => {
        startApp(`grid-item-${uuid}`, Math.floor(idx / 2), idx % 2);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Divider />

      <Container>
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
      </Container>

      <Divider />

      <Grid ref={containerRef} />
    </>
  );
}

export default Route(GridPage);
