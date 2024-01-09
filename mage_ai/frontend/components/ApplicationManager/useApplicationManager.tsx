import { createRef, useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import Header from './Header';
import VersionControlFileDiffs from '@components/VersionControlFileDiffs';
import useResizeElement from '@utils/useResizeElement';
import { ApplicationConfiguration } from '@components/CommandCenter/constants';
import { ApplicationExpansionUUIDEnum, StatusEnum } from '@storage/ApplicationManager/constants';
import {
  buildDefaultLayout,
  closeApplication as closeApplicationFromCache,
  getApplications as getApplicationsFromCache,
  updateApplication,
} from '@storage/ApplicationManager/cache';
import {
  ContainerStyle,
  ContentStyle,
  InnerStyle,
  ResizeLeftStyle,
  ResizeRightStyle,
  ResizeTopStyle,
  ResizeBottomStyle,
} from './index.style';
import { KeyValueType } from '@interfaces/CommandCenterType';

const ROOT_APPLICATION_UUID = 'ApplicationManager';

export default function useApplicationManager({
  applicationState,
  onChangeState,
}: {
  applicationState: {
    current: KeyValueType;
  };
  onChangeState?: (prev: (data: any) => any) => any;
}): {
  closeApplication: (uuid: ApplicationExpansionUUIDEnum) => void;
  getApplications: () => {
    applications: ApplicationConfiguration[];
    expansions: any[];
    containers: any[];
    roots: any[];
  };
  renderApplications: () => Element;
  startApplication: (applicationConfiguration: ApplicationConfiguration) => void;
} {
  const [selectedTab, setSelectedTab] = useState();

  const refRootApplication = useRef(null);
  // References to the application configurations in memory.
  const refApplications = useRef({});
  // References to the rendered expansion component.
  const refExpansions = useRef({});
  // References to the containers that were rendered when renderApplications was called.
  const refContainers = useRef({});
  // References to the root DOM elements where expansions are rendered in.
  const refRoots = useRef({});
  // 4 sides of each application can be used to resize the application.
  const refResizers = useRef({});

  function closeApplication(uuid: ApplicationExpansionUUIDEnum) {
    closeApplicationFromCache(uuid);

    const refRoot = refRoots?.current?.[uuid];
    if (refRoot) {
      refRoots.current[uuid] = undefined;
      refRoot?.unmount();
    }
  }

  function getActiveApplication() {
    return refApplications?.current?.[ApplicationExpansionUUIDEnum.VersionControlFileDiffs];
  }

  function onResizeCallback({
    height,
    width,
    x,
    y,
    z,
  }) {
    const apps = getApplicationsFromCache({
      status: StatusEnum.OPEN,
    });
    const app = apps?.[0];
    if (app) {
      updateApplication({
        layout: {
          dimension: {
            height,
            width,
          },
          position: {
            x,
            y,
            z,
          },
        },
        uuid: app?.uuid,
      });
    }
  }

  const {
    setResizableObject,
    setResizersObjects,
  } = useResizeElement({
    onResizeCallback,
  });

  function getApplications() {
    return {
      applications: refApplications,
      expansions: refExpansions,
      containers: refContainers,
      roots: refRoots,
    };
  }

  function renderApplications() {
    return (
      <>
        <div id={ROOT_APPLICATION_UUID} ref={refRootApplication} />

        {Object.keys(ApplicationExpansionUUIDEnum).map((uuid) => {
          if (!refContainers?.current) {
            refContainers.current = {};
          }

          const ref = refContainers?.current?.[uuid] || createRef()
          refContainers.current[uuid] = ref;

          return (
            <div
              id={uuid}
              key={uuid}
              ref={ref}
            />
          );
        })}
      </>
    );
  }

  // https://stackoverflow.com/questions/20926551/recommended-way-of-making-react-component-div-draggable
  // Draggable

  function startApplication(applicationConfiguration: ApplicationConfiguration) {
    const {
      application,
    } = applicationConfiguration;
    const {
      expansion_settings: expansionSettings,
    } = application;
    const uuid = expansionSettings?.uuid;

    if (!refApplications?.current) {
      refApplications.current = {};
    }
    refApplications.current[uuid] = applicationConfiguration;

    if (ApplicationExpansionUUIDEnum.VersionControlFileDiffs === uuid) {
      if (!refRoots?.current?.[uuid]) {
        const domNode = document.getElementById(uuid);
        refRoots.current[uuid] = createRoot(domNode);
      }

      const ref = refExpansions?.current?.[uuid] || createRef();
      refExpansions.current[uuid] = ref;

      const {
        layout,
      } = updateApplication({
        applicationConfiguration,
        state: {
          status: StatusEnum.OPEN,
        },
        uuid,
      });

      if (!refResizers?.current?.[uuid]) {
        refResizers.current[uuid] = {
          bottom: createRef(),
          left: createRef(),
          right: createRef(),
          top: createRef(),
        };
      }

      const rr = refResizers?.current?.[uuid];

      const {
        dimension: {
          height,
          width,
        },
        position: {
          x,
          y,
          z,
        },
      } = layout;

      const expansion = (
        <ContainerStyle
          ref={ref}
          style={{
            height,
            left: x,
            top: y,
            width,
            zIndex: z,
        }}>
          <ResizeBottomStyle ref={rr?.bottom} />
          <ResizeLeftStyle ref={rr?.left} />
          <ResizeRightStyle ref={rr?.right} />
          <ResizeTopStyle ref={rr?.top} />

          <Header
            applications={getApplicationsFromCache()}
            closeApplication={(uuidApp: ApplicationExpansionUUIDEnum) => closeApplication(uuidApp)}
            resetLayout={(uuidApp: ApplicationExpansionUUIDEnum) => {
              const element = refExpansions?.current?.[uuidApp];
              console.log(element)
              if (element) {
                const {
                  layout: {
                    dimension,
                    position,
                  },
                } = updateApplication({
                  layout: buildDefaultLayout(),
                  uuid: uuidApp,
                });

                console.log(dimension?.height)

                element.current.style.height = `${dimension?.height}px`;
                element.current.style.left = `${position?.x}px`;
                element.current.style.top = `${position?.y}px`;
                element.current.style.width = `${dimension?.width}px`;
              }
            }}
            setSelectedTab={setSelectedTab}
          />

          <ContentStyle>
            <InnerStyle>
              <VersionControlFileDiffs
                applicationConfiguration={applicationConfiguration}
                applicationState={applicationState}
                onChangeState={(prev) => {
                  if (onChangeState) {
                    onChangeState?.(prev);
                  }
                }}
                uuid={uuid}
              />
            </InnerStyle>
          </ContentStyle>
        </ContainerStyle>
      );

      refRoots?.current?.[uuid]?.render(expansion);

      setResizableObject(ref, {
        tries: 10,
      });
      setResizersObjects(Object.values(rr || {}), {
        tries: 10,
      });
    }
  }

  useEffect(() => {
    getApplicationsFromCache({ status: StatusEnum.OPEN }).forEach(({
      applicationConfiguration,
    }) => {
      startApplication(applicationConfiguration);
    });
  }, []);

  return {
    closeApplication,
    getApplications,
    renderApplications,
    startApplication,
  };
}
