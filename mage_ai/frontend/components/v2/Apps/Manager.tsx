import React, { useEffect } from 'react';
import { createRef, useContext, useRef, useState } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import dynamic from 'next/dynamic';
import { createRoot } from 'react-dom/client';

import TextInput from '@mana/elements/Input/TextInput';
import Button, { ButtonGroup } from '@mana/elements/Button';
import Grid from '@mana/components/Grid';
import { ModeEnum } from '@mana/themes/modes';
import { AppConfigType, OperationTypeEnum, PanelType } from './interfaces';
import { setThemeSettings } from '@mana/themes/utils';
import { DefaultPanel } from './catalog';
import { Dark, Menu, PanelCollapseLeft } from '@mana/icons';
import { updateClassnames, upsertRootElement } from './utils';
import styles from '@styles/scss/apps/Manager/Manager.module.scss';

function Manager() {
  const phaseRef = useRef(0);

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
    const { apps: builders, layout, uuid } = panel;

    const container = document.getElementById(uuid);

    if (container) {
      container.remove();
    }
    const element = upsertRootElement({ uuid });

    if (layout?.column <= -1) {
      containerRef?.current.prepend(element);
    } else {
      containerRef?.current.appendChild(element);
    }

    builders?.forEach((builder: (props?: any) => AppConfigType, idx: number) => {
      const app = builder({});

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
                apps={[app]}
                operations={{
                  [OperationTypeEnum.REMOVE_APP]: {
                    effect: (_, appConfigs: Record<string, AppConfigType>) =>
                      !Object.keys(appConfigs || {})?.length && removePanel(panel),
                  },
                }}
              />
            </ThemeProvider>,
          );

          updateLayout();
        }
      }, idx * 100);
    });
  }

  function toggleFileBrowser() {
    const panel = DefaultPanel({
      operations: {
        [OperationTypeEnum.ADD_PANEL]: {
          effect: addPanel,
        },
      },
    });

    panel.apps = panel.apps.map(
      builder => (appProps: AppConfigType) =>
        builder({
          ...appProps,
          operations: {
            ...(appProps.operations || {}),
            [OperationTypeEnum.ADD_PANEL]: {
              effect: addPanel,
            },
          },
        }),
    );

    if (refRoots?.current?.[panel.uuid]) {
      removePanel(panel);
    } else {
      addPanel(panel);
    }

    setFileBrowserVisible(prev => !prev);
  }

  useEffect(() => {
    if (phaseRef.current === 0) {
      const loadServices = async () => {
        await import('../IDE/Manager').then(mod => {
          mod.Manager.loadServices();
          phaseRef.current = 1;
        });
      };

      loadServices();
    }

    const disposeManager = async () => {
      await import('../IDE/Manager').then(mod => {
        mod.Manager.dispose();
      });
    };

    return () => {
      disposeManager();
    };
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
              toggleFileBrowser();
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
