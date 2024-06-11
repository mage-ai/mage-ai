import React from 'react';
import { createRef, useContext, useRef } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import dynamic from 'next/dynamic';
import { createRoot } from 'react-dom/client';

import TextInput from '@mana/elements/Input/TextInput';
import Button, { ButtonGroup } from '@mana/elements/Button';
import Grid from '@mana/components/Grid';
import { WithOnMount } from '@mana/hooks/useWithOnMount';
import { removeClassNames } from '@utils/elements';
import { randomSimpleHashGenerator } from '@utils/string';
import { ModeEnum } from '@mana/themes/modes';
import { AppConfigType } from './interfaces';
import { setThemeSettings } from '@mana/themes/utils';
import { AppSubtypeEnum, AppTypeEnum } from './constants';
import { Cluster, Dark } from '@mana/icons';
import { updateClassnames, upsertRootElement } from './utils';

import styles from '@styles/scss/pages/Apps/Manager.module.scss';

function Manager() {
  const themeContext = useContext(ThemeContext);
  const containerRef = useRef(null);
  const refCells = useRef({});
  const refRoots = useRef({});

  function updateLayout() {
    if (containerRef?.current) {
      const columns = Object.keys(refCells?.current || {})?.length || 1;
      const regex = /(template-columns-\d+)/;

      updateClassnames(containerRef?.current, [`template-columns-${columns}`], cn =>
        regex.test(cn),
      );
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

    containerRef?.current.appendChild(upsertRootElement({ uuid }));

    apps?.forEach((app: AppConfigType, idx: number) => {
      setTimeout(() => {
        const parentNode = document.getElementById(uuid);

        if (parentNode && !refRoots.current[uuid]) {
          refRoots.current[uuid] = createRoot(parentNode as HTMLElement);
          const ref = createRef() as React.Ref<HTMLDivElement>;
          refCells.current[uuid] = ref;

          const AppLayout = dynamic(() => import('@components/v2/Apps/Layout'), {
            ssr: false,
          });

          refRoots.current[uuid].render(
            <ThemeProvider theme={themeContext}>
              <AppLayout
                apps={[app]}
                onRemoveApp={(
                  _,
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
          if (!Object.keys(refCells?.current || {})?.length) {
            setTimeout(() => {
              addPanel('test-panel-1', [
                {
                  subtype: AppSubtypeEnum.SYSTEM,
                  type: AppTypeEnum.BROWSER,
                  uuid: 'test-system-browser-app',
                },
              ]);
              // setTimeout(() => {
              //   addPanel('test-panel-2', [
              //     {
              //       subtype: AppSubtypeEnum.IDE,
              //       type: AppTypeEnum.EDITOR,
              //       uuid: 'test-editor-ide-app',
              //     },
              //   ]);
              // }, 1000);
            }, 1);
          }
        }
      }}
    >
      <div className={styles.container}>
        <Grid
          height="inherit"
          overflow="visible"
          padding={12}
          rowGap={12}
          templateColumns="auto-fill"
          templateRows="auto 1fr"
          width="100%"
        >
          <Grid
            columnGap={12}
            overflow="visible"
            row={1}
            templateColumns="auto 1fr 1fr auto"
            templateRows="1fr"
            width="inherit"
          >
            <Button
              Icon={Cluster}
              onClick={() => {
                console.log('Run pipeline');
              }}
              primary
            >
              Run pipeline
            </Button>

            <TextInput monospace number placeholder="Row" />

            <TextInput monospace number placeholder="Column" />

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
          </Grid>

          <Grid
            autoFlow="column"
            columnGap={12}
            ref={containerRef}
            row={2}
            templateRows="1fr"
            width="inherit"
          />
        </Grid>
      </div>
    </WithOnMount>
  );
}

export default Manager;
