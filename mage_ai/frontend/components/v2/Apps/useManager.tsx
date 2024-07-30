import ContextProvider from '@context/v2/ContextProvider';
import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AppConfigType, OperationTypeEnum, PanelType } from './interfaces';
import { createRef, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { updateClassnames, upsertRootElement } from './utils';
import { objectSize } from '@utils/hash';

type AppManagerProps = {
  containerRef: React.MutableRefObject<HTMLDivElement>;
  onAddPanel?: (panel: PanelType, panelCount: number) => void;
  onRemovePanel?: (panel: PanelType, panelCount: number) => void;
  shouldLoadServices?: boolean;
};

export default function useManager({
  containerRef,
  onAddPanel,
  onRemovePanel,
  shouldLoadServices,
}: AppManagerProps) {
  const phaseRef = useRef(0);
  const refCells = useRef({});
  const refRoots = useRef({});

  function updateLayout() {
    if (containerRef.current) {
      const columns = Object.keys(refCells?.current || {})?.length || 1;
      const regex = /(template-columns-\d+)/;

      updateClassnames(containerRef.current, [`template-columns-${columns}`], cn =>
        regex.test(cn),
      );
    }
  }

  function removePanel(panel: PanelType) {
    const { uuid } = panel;

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

    if (onRemovePanel) {
      onRemovePanel(panel, objectSize(refCells.current ?? {}));
    }
  }

  function addPanel(panel: PanelType) {
    const { apps: builders, layout, uuid } = panel;

    const container = document.getElementById(uuid);

    if (container) {
      container.remove();
    }
    const element = upsertRootElement({ uuid });

    if (layout?.column <= -1) {
      containerRef.current.prepend(element);
    } else {
      containerRef.current.appendChild(element);
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
            <ContextProvider>
              <AppLayout
                apps={[app]}
                operations={{
                  [OperationTypeEnum.REMOVE_APP]: {
                    effect: (_, appConfigs: Record<string, AppConfigType>) =>
                      !Object.keys(appConfigs || {})?.length && removePanel(panel),
                  },
                }}
              />
            </ContextProvider>,
          );

          updateLayout();
        }

        if (onAddPanel) {
          onAddPanel(panel, objectSize(refCells.current ?? {}));
        }
      }, idx * 100);
    });
  }

  useEffect(() => {
    if (phaseRef.current === 0 && shouldLoadServices) {
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

  return {
    addPanel,
  };
}
