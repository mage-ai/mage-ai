import React, { useCallback } from 'react';
import { createRef, useContext, useRef, useState } from 'react';
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
import { AppConfigType, PanelType } from './interfaces';
import { setThemeSettings } from '@mana/themes/utils';
import { AppSubtypeEnum, AppTypeEnum } from './constants';
import { DefaultPanel } from './catalog';
import { Cluster, Dark, Menu, PanelCollapseLeft } from '@mana/icons';
import { updateClassnames, upsertRootElement } from './utils';
import styles from '@styles/scss/pages/Apps/Manager.module.scss';

function Manager() {
  const addingPanel = useRef(false);
  const themeContext = useContext(ThemeContext);
  const containerRef = useRef(null);
  const refCells = useRef({});
  const refRoots = useRef({});

  const [fileBrowserVisible, setFileBrowserVisible] = useState(false);

  function updateLayout() {
    if (containerRef?.current) {
      const columns = Object.keys(refCells?.current || {})?.length || 1;
      const regex = /(template-columns-\d+)/;

      updateClassnames(containerRef?.current, [`template-columns-${columns}`], cn =>
        regex.test(cn),
      );
    }
  }

  function removePanel({ uuid }: PanelType) {
    const parentNode = document.getElementById(uuid);
    if (parentNode) {
      parentNode?.remove();
    }

    if (refCells?.current?.[uuid]) {
      delete refCells.current[uuid];
    }

    if (refRoots?.current?.[uuid]) {
      refRoots.current[uuid].unmount();
      delete refRoots.current[uuid];
    }

    updateLayout();
  }

  function addPanel(panel: PanelType) {
    const { apps, uuid  } = panel;

    const container = document.getElementById(uuid);

    if (container) {
      container.remove();
    }
    const element = upsertRootElement({ uuid });

    containerRef?.current.appendChild(element);

    apps?.forEach((app: AppConfigType, idx: number) => {
      if (uuid === app.uuid) {
        throw new Error('Panel UUID cannot match any app UUID');
      }

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
                addPanel={addPanel}
                apps={[app]}
                onRemoveApp={(
                  _,
                  appConfigs: {
                    [uuid: string]: AppConfigType;
                  },
                ) => {
                  if (!Object.keys(appConfigs || {})?.length) {
                    removePanel(panel);
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

  const togglePanel = useCallback((panel: PanelType) => {
    if (refRoots?.current?.[panel.uuid]) {
      removePanel(panel);
    } else {
      addPanel(panel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
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
            Icon={fileBrowserVisible ? PanelCollapseLeft : Menu}
            basic={fileBrowserVisible}
            onClick={() => {
              togglePanel(DefaultPanel);
              setFileBrowserVisible(prev => !prev);
            }}
          />

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
  );
}

export default Manager;
