import { GridThemeProvider } from 'styled-bootstrap-grid';
import { ThemeContext } from 'styled-components';
import { ThemeProvider } from 'styled-components';
import { createRef, useEffect, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import ArcaneLibrary from '@components/Applications/ArcaneLibrary';
import Header from './Header';
import KeyboardContext from '@context/Keyboard';
import VersionControlFileDiffs from '@components/VersionControlFileDiffs';
import dark from '@oracle/styles/themes/dark';
import useAutoResizer, { DimensionDataType, RectType} from '@utils/useAutoResizer';
import useClickOutside from '@utils/useClickOutside';
import useDraggableElement from '@utils/useDraggableElement';
import useGlobalKeyboardShortcuts from '@utils/hooks/keyboardShortcuts/useGlobalKeyboardShortcuts';
import useResizeElement from '@utils/useResizeElement';
import { ApplicationConfiguration } from '@components/CommandCenter/constants';
import { ApplicationExpansionUUIDEnum, LayoutType, StatusEnum, StateType } from '@storage/ApplicationManager/constants';
import { ErrorProvider } from '@context/Error';
import {
  ContainerStyle,
  ContentStyle,
  DockStyle,
  HEADER_HEIGHT,
  InnerStyle,
  OVERLAY_ID,
  OverlayStyle,
  ResizeBottomStyle,
  ResizeLeftStyle,
  ResizeRightStyle,
  ResizeTopStyle,
  RootApplicationStyle,
} from './index.style';
import { KeyValueType } from '@interfaces/CommandCenterType';
import { ModalProvider } from '@context/Modal';
import { addClassNames, removeClassNames } from '@utils/elements';
import {
  buildDefaultLayout,
  buildMaximumLayout,
  closeApplication as closeApplicationFromCache,
  getApplications as getApplicationsFromCache,
  updateApplication,
} from '@storage/ApplicationManager/cache';
import { pauseEvent } from '@utils/events';
import { selectEntriesWithValues } from '@utils/hash';

const GROUP_ID = 'ApplicationManagerGroup';
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
  const themeContext = useContext(ThemeContext);
  const keyboardContext = useContext(KeyboardContext);

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

  function onResizeCallback(
    uuid: ApplicationExpansionUUIDEnum,
    data: DimensionDataType,
    elementRect: RectType,
  ): void {
    updateApplicationLayoutAndState(uuid, {
      layout: {
        dimension: selectEntriesWithValues(elementRect, ['height', 'width']),
        position: selectEntriesWithValues(elementRect, ['x', 'y']),
      },
    }, {
      layout: true,
      state: false,
    });
  }

  const {
    deregisterElementUUIDs,
    observeThenResizeElements,
  } = useAutoResizer({
    onResize: onResizeCallback,
  });

  function closeApplication(uuid: ApplicationExpansionUUIDEnum) {
    closeApplicationFromCache(uuid);

    const refRoot = refRoots?.current?.[uuid];
    if (refRoot) {
      refRoots.current[uuid] = undefined;
      refRoot?.unmount();
    }

    deregisterElementUUIDs([uuid]);
  }

  function getActiveApplication() {
    return refApplications?.current?.[ApplicationExpansionUUIDEnum.VersionControlFileDiffs];
  }

  function updateApplicationLayoutAndState(uuid: ApplicationExpansionUUIDEnum, opts?: {
    layout?: LayoutType;
    state?: StateType;
  }, cache: {
    layout?: boolean;
    state?: boolean;
  } = {
    layout: true,
    state: true,
  }) {
    const element = refExpansions?.current?.[uuid];
    const data: {
      layout?: LayoutType;
      state?: StateType;
    } = {};

    if (cache?.layout) {
      data.layout = opts?.layout;
    }
    if (cache?.state) {
      data.state = opts?.state;
    }

    if (element) {
      const {
        layout,
      } = updateApplication({
        ...data,
        uuid,
      });

      const { dimension, position } = opts?.layout || layout;

      element.current.style.height = `${dimension?.height}px`;
      element.current.style.left = `${position?.x}px`;
      element.current.style.top = `${position?.y}px`;
      element.current.style.width = `${dimension?.width}px`;
    }
  }

  function minimizeApplication(uuid: ApplicationExpansionUUIDEnum, reverse: boolean = false) {
    const app = getApplicationsFromCache({
      uuid,
    })?.[0];

    updateApplicationLayoutAndState(uuid, {
      layout: reverse ? app?.layout : buildDefaultLayout(),
      state: {
        status: reverse ? StatusEnum.OPEN : StatusEnum.MINIMIZED,
      },
    }, {
      layout: false,
      state: true,
    });

    const refExpansion = refExpansions?.current?.[uuid];
    const refContainer = refContainers?.current?.[uuid];

    if (!reverse && refExpansion?.current) {
      refExpansion.current.style.bottom = null;
      refExpansion.current.style.left = null;
      refExpansion.current.style.right = null;
      refExpansion.current.style.top = null;
    }
    [refExpansion, refContainer].forEach((ref) => {
      if (ref?.current) {
        const func = reverse ? removeClassNames : addClassNames;
        ref.current.className = func(
          ref?.current?.className || '',
          [
            'minimized',
          ],
        );
      }
    });

    if (reverse) {
      observeThenResizeElements({
        [uuid]: refExpansion,
      });
    } else {
      deregisterElementUUIDs([uuid]);
    }
  }

  function onChangeLayoutPosition(uuid: ApplicationExpansionUUIDEnum, {
    height,
    width,
    x,
    y,
    z,
  }: {
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    z?: number;
  }) {
    const apps = getApplicationsFromCache({
      status: StatusEnum.OPEN,
      uuid,
    });
    const app = apps?.[0];
    if (app) {
      updateApplication({
        layout: {
          // @ts-ignore
          dimension: selectEntriesWithValues({
            height,
            width,
          }),
          // @ts-ignore
          position: selectEntriesWithValues({
            x,
            y,
            z,
          }),
        },
        uuid: app?.uuid,
      });
    }
  }

  function onClickOutside(uuid: ApplicationExpansionUUIDEnum, isOutside: boolean, {
    group,
  }) {
    // Don’t minimize when clicking outside
    // if (Object.values(group || {})?.every(({ isOutside }) => isOutside)) {
    //   getApplicationsFromCache().forEach(({ uuid }) => minimizeApplication(uuid));
    // }
  }

  const {
    setElementObject: setElementObjectClickOutside,
  } = useClickOutside({
    onClick: onClickOutside,
  });

  const {
    setResizableObject,
    setResizersObjects,
  } = useResizeElement({
    onResizeCallback: onChangeLayoutPosition,
  });

  const {
    setElementObject,
    setInteractiveElementsObjects,
  } = useDraggableElement({
    onChange: onChangeLayoutPosition,
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
      <RootApplicationStyle id={ROOT_APPLICATION_UUID} ref={refRootApplication}>
        <DockStyle>
          <div style={{ flex: 1 }} />
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
          <div style={{ flex: 1 }} />
        </DockStyle>
      </RootApplicationStyle>
    );
  }

  // https://stackoverflow.com/questions/20926551/recommended-way-of-making-react-component-div-draggable
  // Draggable

  function startApplication(
    applicationConfiguration: ApplicationConfiguration,
    stateProp: StateType = null,
  ) {
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

    if (!refRoots?.current?.[uuid]) {
      const domNode = document.getElementById(uuid);
      refRoots.current[uuid] = createRoot(domNode);
    }

    const ref = refExpansions?.current?.[uuid] || createRef();
    refExpansions.current[uuid] = ref;

    const {
      layout,
      state,
    } = updateApplication({
      applicationConfiguration,
      state: stateProp || {
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

    let AppComponent;
    if (ApplicationExpansionUUIDEnum.VersionControlFileDiffs === uuid) {
      AppComponent = VersionControlFileDiffs;
    } else if (ApplicationExpansionUUIDEnum.ArcaneLibrary === uuid) {
      AppComponent = ArcaneLibrary;
    }

    if (!AppComponent) {
      return;
    }

    const onMountCallback = () => {
      setTimeout(() => {
        if (StatusEnum.MINIMIZED === state?.status) {
          minimizeApplication(uuid);
        }
        ref.current.style.display = 'block';
      }, 1);

      setResizableObject(uuid, ref, {
        tries: 10,
      });
      setResizersObjects(uuid, [rr?.bottom, rr?.left, rr?.right], {
        tries: 10,
      });

      setElementObject(uuid, ref, {
        tries: 10,
      });
      setInteractiveElementsObjects(uuid, [rr?.top], {
        tries: 10,
      });

      setElementObjectClickOutside(uuid, ref, GROUP_ID, {
        tries: 10,
      });

      observeThenResizeElements({
        [uuid]: ref,
      });
    };

    const expansion = (
      <ContainerStyle
        ref={ref}
        style={{
          display: 'none',
          height,
          left: x,
          top: y,
          width,
          zIndex: z,
      }}>
        <ResizeBottomStyle ref={rr?.bottom} />
        <ResizeLeftStyle ref={rr?.left} />
        <ResizeRightStyle ref={rr?.right} />
        {/*<ResizeTopStyle ref={rr?.top} />*/}
        <OverlayStyle
          className={OVERLAY_ID}
          onClick={(e) => {
            pauseEvent(e);
            minimizeApplication(uuid, true);
          }}
        />

        <Header
          applications={getApplicationsFromCache()}
          closeApplication={(uuidApp: ApplicationExpansionUUIDEnum) => closeApplication(uuidApp)}
          maximizeApplication={(uuidApp: ApplicationExpansionUUIDEnum) => {
            updateApplicationLayoutAndState(uuidApp, {
              layout: buildMaximumLayout(),
            });
          }}
          minimizeApplication={(uuidApp: ApplicationExpansionUUIDEnum) => minimizeApplication(uuidApp)}
          ref={rr?.top}
          setSelectedTab={setSelectedTab}
        />

        <ContentStyle>
          <InnerStyle>
            <AppComponent
              applicationConfiguration={applicationConfiguration}
              applicationState={applicationState}
              containerRef={ref}
              headerOffset={HEADER_HEIGHT}
              onChangeState={(prev) => {
                if (onChangeState) {
                  onChangeState?.(prev);
                }
              }}
              onMount={onMountCallback}
              uuid={uuid}
            />
          </InnerStyle>
        </ContentStyle>
      </ContainerStyle>
    );

    refRoots?.current?.[uuid]?.render(
      <KeyboardContext.Provider value={keyboardContext}>
        <ThemeProvider theme={themeContext}>
          <ModalProvider>
            <ErrorProvider>
              {expansion}
            </ErrorProvider>
          </ModalProvider>
        </ThemeProvider>
      </KeyboardContext.Provider>,
    );
  }

  useEffect(() => {
    getApplicationsFromCache().forEach(({
      applicationConfiguration,
      state,
    }) => {
      if (StatusEnum.OPEN === state?.status || StatusEnum.MINIMIZED === state?.status) {
        startApplication(applicationConfiguration, state);
      }
    });
  }, []);

  return {
    closeApplication,
    getApplications,
    renderApplications,
    startApplication,
  };
}
