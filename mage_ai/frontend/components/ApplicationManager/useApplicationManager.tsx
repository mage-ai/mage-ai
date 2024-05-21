import { ThemeContext } from 'styled-components';
import { ThemeProvider } from 'styled-components';
import { createRef, useEffect, useContext, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import ArcaneLibrary from '@components/Applications/ArcaneLibrary';
import ArcaneLibraryConfiguration from '@components/Applications/ArcaneLibrary/configuration.json';
import Header from './Header';
import KeyboardContext from '@context/Keyboard';
import PortalTerminal from '@components/Applications/PortalTerminal';
import VersionControlFileDiffs from '@components/VersionControlFileDiffs';
import useAutoResizer, { DimensionDataType, RectType } from '@utils/useAutoResizer';
import useClickOutside from '@utils/useClickOutside';
import useDraggableElement from '@utils/useDraggableElement';
import Text from 'oracle/elements/Text';
import useResizeElement from '@utils/useResizeElement';
import { ApplicationConfiguration } from '@components/CommandCenter/constants';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { ErrorProvider } from '@context/Error';
import {
  LayoutType,
  StatusEnum,
  StateType,
  ApplicationManagerApplication,
} from '@storage/ApplicationManager/constants';
import {
  ContainerStyle,
  ContentStyle,
  DockStyle,
  HEADER_HEIGHT,
  InnerStyle,
  OVERLAY_ID,
  OverlayStyle,
  ResizeBottomStyle,
  ResizeCornerStyle,
  ApplicationMountStyle,
  ResizeLeftStyle,
  ResizeRightStyle,
  RootApplicationStyle,
  MinimizedApplicationStyle,
} from './index.style';
import { KEY_CODE_ALT_STRING, KEY_CODE_TAB } from '@utils/hooks/keyboardShortcuts/constants';
import { KeyValueType } from '@interfaces/CommandCenterType';
import { ModalProvider } from '@context/Modal';
import { addClassNames, removeClassNames } from '@utils/elements';
import {
  APPLICATION_PADDING,
  DEFAULT_Z_INDEX,
  buildDefaultLayout,
  buildMaximumLayout,
  closeApplication as closeApplicationFromCache,
  getApplications as getApplicationsFromCache,
  updateApplication,
} from '@storage/ApplicationManager/cache';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { selectEntriesWithValues, selectKeys } from '@utils/hash';
import { sortByKey } from '@utils/array';
import { useKeyboardContext } from '@context/Keyboard';

const COMPONENT_UUID = 'ApplicationManager';
const GROUP_ID = 'ApplicationManagerGroup';
const ROOT_APPLICATION_UUID = 'ApplicationManager';

export default function useApplicationManager({
  applicationState,
  onChangeState,
}: {
  applicationState?: {
    current: KeyValueType;
  };
  onChangeState?: (prev: (data: any) => any) => any;
} = {}): {
  closeApplication: (uuid: ApplicationExpansionUUIDEnum) => void;
  renderApplications: () => JSX.Element;
  startApplication: (
    applicationConfiguration: ApplicationConfiguration,
    stateProp?: StateType,
    applicationUUID?: ApplicationExpansionUUIDEnum,
    startUpOptions?: KeyValueType,
  ) => void;
} {
  const themeContext = useContext(ThemeContext);
  const keyboardContext = useContext(KeyboardContext);

  const [selectedTab, setSelectedTab] = useState();
  const [statusMapping, setStatusMapping] = useState<{
    [key: string]: StatusEnum;
  }>({});

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

  function getOpenApplications({
    ascending,
  }: {
    ascending?: boolean;
  } = {
    ascending: false,
  }): ApplicationManagerApplication[] {
    const apps = getApplicationsFromCache({ statuses: [StatusEnum.ACTIVE, StatusEnum.OPEN] })?.map((app) => ({
      ...app,
      element: refExpansions?.current?.[app?.uuid],
    }));

    return sortByKey(
      apps,
      ({ element }) => Number(element?.current?.style?.zIndex || 0),
      { ascending },
    );
  }

  function updateZIndex(uuid: ApplicationExpansionUUIDEnum) {
    let pick = null;
    const apps = [];
    getOpenApplications({
      ascending: true,
    })?.forEach((app) => {
      if (app?.uuid === uuid) {
        pick = app;
      } else {
        apps.push(app);
      }
    });


    apps?.forEach(({
      element,
      uuid: uuidApp,
    }, idx: number) => {
      const z = DEFAULT_Z_INDEX + idx;
      if (element && element.current) {
        element.current.style.zIndex = z;
      }

      updateApplicationLayoutAndState(uuidApp, {
        layout: {
          position: {
            z,
          },
        },
      }, {
        layout: true,
        state: false,
      });
    });

    if (pick?.element?.current) {
      const z = DEFAULT_Z_INDEX + (apps?.length || 0);
      pick.element.current.style.zIndex = z;
      updateApplicationLayoutAndState(uuid, {
        layout: {
          position: {
            z,
          },
        },
      }, {
        layout: true,
        state: false,
      });
    }
  }

  function onResizeCallback(
    uuid: ApplicationExpansionUUIDEnum,
    data: DimensionDataType,
    elementRect: RectType,
  ): void {
    const app = getApplicationsFromCache({ uuid })?.[0];

    if ([StatusEnum.ACTIVE, StatusEnum.OPEN].includes(app?.state?.status)) {
      updateApplicationLayoutAndState(uuid, {
        layout: {
          dimension: selectEntriesWithValues(selectKeys(elementRect, ['height', 'width'])),
          position: selectEntriesWithValues(selectKeys(elementRect, ['x', 'y'])),
        },
      }, {
        layout: true,
        state: false,
      });
    }
  }

  const {
    deregisterElementUUIDs,
    observeThenResizeElements,
    setOnResize,
  } = useAutoResizer();

  function closeApplication(uuid: ApplicationExpansionUUIDEnum) {
    closeApplicationFromCache(uuid);

    const refRoot = refRoots?.current?.[uuid];
    if (refRoot) {
      refRoots.current[uuid] = undefined;
      refRoot?.unmount();
    }

    deregisterElementUUIDs([uuid]);
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
  }): ApplicationManagerApplication {
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

    let app;
    if (element && element.current) {
      app = updateApplication({
        ...data,
        uuid,
      });

      const { dimension, position } = opts?.layout || app?.layout;

      element.current.style.height = `${dimension?.height}px`;
      element.current.style.left = `${position?.x}px`;
      element.current.style.top = `${position?.y}px`;
      element.current.style.width = `${dimension?.width}px`;
    }

    setStatusMapping(prev => ({
      ...prev,
      [uuid]: app?.state?.status,
    }));

    return app;
  }

  function setApplicationInactive(uuidInit: ApplicationExpansionUUIDEnum, opts: {
    all?: boolean;
    reverse?: boolean;
  } = {
    all: false,
    reverse: false,
  }) {
    const { all, reverse } = opts || {};

    getApplicationsFromCache(all ? {} : { uuid: uuidInit })?.forEach((app, idx: number) => {
      const uuid = app?.uuid;
      const appUpdated = updateApplicationLayoutAndState(uuid, {
        state: {
          status: reverse
            ? idx === 0
              ? StatusEnum.ACTIVE
              : StatusEnum.OPEN
            : StatusEnum.MINIMIZED,
        },
      }, {
        layout: false,
        state: true,
      });
    });
  }

  function changeApplicationStatus(
    uuidInit: ApplicationExpansionUUIDEnum,
    status: StatusEnum,
    opts: { all?: boolean } = {},
  ) {
    getApplicationsFromCache(opts?.all ? {} : { uuid: uuidInit })?.forEach((app) => {
      const uuid = app?.uuid;
      updateApplicationLayoutAndState(uuid, {
        state: {
          status,
        },
      }, {
        layout: false,
        state: true,
      });

      let refContainer = refContainers?.current?.[uuid];
      if (uuid === ApplicationExpansionUUIDEnum.ArcaneLibrary && !refContainer) {
        const arcaneLibraryContainerNode = document.getElementById(uuid);
        if (arcaneLibraryContainerNode) {
          refContainer = { current: arcaneLibraryContainerNode };
        }
      }
    });
  }

  function restoreApplication(uuid: ApplicationExpansionUUIDEnum, opts: { all?: boolean } = {}) {
    changeApplicationStatus(uuid, StatusEnum.ACTIVE, opts);
  }

  function pauseApplication(uuid: ApplicationExpansionUUIDEnum, opts: { all?: boolean } = {}) {
    changeApplicationStatus(uuid, StatusEnum.INACTIVE, opts);
  }

  function minimizeApplication(uuid: ApplicationExpansionUUIDEnum, opts: { all?: boolean } = {}) {
    changeApplicationStatus(uuid, StatusEnum.MINIMIZED, opts);
  }

  function openApplication(uuid: ApplicationExpansionUUIDEnum, opts: { all?: boolean } = {}) {
    changeApplicationStatus(uuid, StatusEnum.OPEN, opts);
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
      statuses: [StatusEnum.ACTIVE, StatusEnum.OPEN],
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

  function onChangePosition(uuid: ApplicationExpansionUUIDEnum, opts) {
    const {
      clientX,
      clientY,
    } = opts?.event || {
      clientX: null,
      clientY: null,
    };

    let height;
    let width;
    let x;
    let y;

    const percentageY = clientY / (typeof window === 'undefined' ? 0 : window.innerHeight);
    const percentageX = clientX / (typeof window === 'undefined' ? 0 : window.innerWidth);

    if (clientX <= APPLICATION_PADDING || (typeof window !== 'undefined' && (clientX + APPLICATION_PADDING) >= window.innerWidth)) {
      pauseEvent(opts?.event);

      height = 1;
      width = 0.5;
      y = 0;

      if (percentageY <= 0.1) {
        // Top corner
        height = 0.5;
      } else if (percentageY >= 0.5) {
        // Bottom corner
        height = 0.5;
        y = 0.5;
      }

      // Left side: layout aligned to the left side
      if (clientX <= APPLICATION_PADDING) {
        x = 0;
      } else {
        x = 0.5;
      }

      updateApplicationLayoutAndState(uuid, {
        layout: buildMaximumLayout(null, {
          height,
          width,
          x,
          y,
        }),
      }, {
        layout: true,
        state: false,
      });
    } else if (clientY <= APPLICATION_PADDING || (typeof window !== 'undefined' && (clientY + APPLICATION_PADDING) >= window.innerHeight)) {
      pauseEvent(opts?.event);

      height = 0.5;
      width = 1;
      x = 0;

      if (percentageX <= 0.25) {
        // Left corner
        width = 0.5;
      } else if (percentageX >= 0.75) {
        // Right corner
        width = 0.5;
        x = 0.5;
      }

      if (clientY <= APPLICATION_PADDING) {
        // Top
        y = 0;
      } else {
        // Bottom
        y = 0.5;
      }

      updateApplicationLayoutAndState(uuid, {
        layout: buildMaximumLayout(null, {
          height,
          width,
          x,
          y,
        }),
      }, {
        layout: true,
        state: false,
      });
    } else {
      onChangeLayoutPosition(uuid, opts);
    }
  }

  function onClickOutside(uuid: ApplicationExpansionUUIDEnum, isOutside: boolean, { group }) {
    const allOutside = Object.values(group || {})?.every(({ isOutside }) => isOutside);

    const apps = getOpenApplications();
    const app = apps?.find(a => uuid === a?.uuid);
    let status = app?.state?.status;
    const minimized = StatusEnum.MINIMIZED === status;

    if (apps?.length >= 2) {
      if (allOutside) {
        status = StatusEnum.MINIMIZED;
      } else if (isOutside && !minimized) {
        status = StatusEnum.OPEN;
      } else {
        status = StatusEnum.ACTIVE;
      }
    } else {
      if (allOutside && !minimized) {
        status = StatusEnum.INACTIVE;
      } else if (isOutside && !minimized) {
        status = StatusEnum.INACTIVE;
      } else {
        status = StatusEnum.ACTIVE;
      }
    }

    if (StatusEnum.ACTIVE === status) {
      restoreApplication(uuid);
    } else if (StatusEnum.INACTIVE === status) {
      pauseApplication(uuid);
    } else if (StatusEnum.MINIMIZED === status) {
      minimizeApplication(uuid);
    } else if (StatusEnum.OPEN === status) {
      openApplication(uuid);
    }
  }

  const {
    setElementObject: setElementObjectClickOutside,
  } = useClickOutside({
    onClick: onClickOutside,
  });

  function onStartResize(uuid: ApplicationExpansionUUIDEnum) {
    updateZIndex(uuid);
  }

  const {
    setResizableObject,
    setResizersObjects,
    setOnResize: setOnResizeElement,
    setOnStart,
  } = useResizeElement();

  const {
    setElementObject,
    setInteractiveElementsObjects,
    setOnChange,
  } = useDraggableElement();

  function renderApplications() {
    return (
      <RootApplicationStyle id={ROOT_APPLICATION_UUID} ref={refRootApplication}>
        <DockStyle>
          {getApplicationsFromCache()?.map(({
            applicationConfiguration,
            uuid,
          }) => {
            const status = statusMapping?.[uuid];
            if (StatusEnum.MINIMIZED === status) {
              return (
                <MinimizedApplicationStyle key={uuid}>
                  <Text>
                    {applicationConfiguration?.item?.title}
                    {applicationConfiguration?.item?.description}
                  </Text>
                </MinimizedApplicationStyle>
              );
            }
          })}

          {Object.keys(ApplicationExpansionUUIDEnum).map((uuid) => {
            if (!refContainers?.current) {
              refContainers.current = {};
            }

            const ref = refContainers?.current?.[uuid] || createRef();
            refContainers.current[uuid] = ref;

            return (
              <ApplicationMountStyle
                id={uuid}
                key={uuid}
                ref={ref}
                status={statusMapping?.[uuid]}
              />
            );
          })}
        </DockStyle>
      </RootApplicationStyle>
    );
  }

  function startApplication(
    applicationConfiguration: ApplicationConfiguration,
    stateProp: StateType = null,
    applicationUUID: ApplicationExpansionUUIDEnum = null,
    startUpOptions: KeyValueType = null,
  ) {
    if (applicationUUID && ApplicationExpansionUUIDEnum.ArcaneLibrary === applicationUUID) {
      // @ts-ignore
      applicationConfiguration = ArcaneLibraryConfiguration.applicationConfiguration;

      const arcaneLibraryNode = document.getElementById(applicationUUID);
      // Check if the ArcaneLibrary app is already open. If it is, we do NOT open a second instance
      // of it, otherwise it will cause UI flickering issues when hovering over the window.
      if (arcaneLibraryNode && arcaneLibraryNode.hasChildNodes()) {
        return;
      }
    }

    if (!applicationConfiguration?.application) {
      return;
    }

    const {
      application,
    } = applicationConfiguration;
    const {
      expansion_settings: expansionSettings,
    } = application;
    const uuid: ApplicationExpansionUUIDEnum = expansionSettings?.uuid;

    if (!refApplications?.current) {
      refApplications.current = {};
    }
    refApplications.current[uuid] = applicationConfiguration;

    if (!refRoots?.current?.[uuid]) {
      const domNode = document.getElementById(uuid);
      if (domNode) {
        refRoots.current[uuid] = createRoot(domNode);
      }
    }

    const ref = refExpansions?.current?.[uuid] || createRef();
    refExpansions.current[uuid] = ref;

    const noApps = !getOpenApplications()?.length;

    const {
      layout,
      state,
    } = updateApplication({
      applicationConfiguration,
      state: stateProp || {
        status: noApps ? StatusEnum.ACTIVE : StatusEnum.OPEN,
      },
      uuid,
    });

    if (!refResizers?.current?.[uuid]) {
      refResizers.current[uuid] = {
        bottom: createRef(),
        bottomLeft: createRef(),
        bottomRight: createRef(),
        left: createRef(),
        right: createRef(),
        top: createRef(),
        topLeft: createRef(),
        topRight: createRef(),
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

    let AppComponent = null;
    if (ApplicationExpansionUUIDEnum.ArcaneLibrary === uuid) {
      AppComponent = ArcaneLibrary;
    } else if (ApplicationExpansionUUIDEnum.PortalTerminal === uuid) {
      AppComponent = PortalTerminal;
    } else if (ApplicationExpansionUUIDEnum.VersionControlFileDiffs === uuid) {
      AppComponent = VersionControlFileDiffs;
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
      setResizersObjects(uuid, [
        rr?.bottom,
        rr?.bottomLeft,
        rr?.bottomRight,
        rr?.left,
        rr?.right,
        rr?.topLeft,
        rr?.topRight,
      ], {
        tries: 10,
      });
      setOnResizeElement(onChangeLayoutPosition);
      setOnStart(onStartResize);

      setOnChange(onChangePosition);

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
      setOnResize(onResizeCallback);
    };

    const status = statusMapping?.[uuid];
    const expansion = (
      <ContainerStyle
        onClick={() => updateZIndex(uuid)}
        ref={ref}
        status={status}
        style={{
          display: 'none',
          height,
          left: x,
          top: y,
          width,
          zIndex: (getOpenApplications()?.[0]?.layout?.position?.z || z) + 1,
      }}>
        <ResizeBottomStyle onClick={() => updateZIndex(uuid)} ref={rr?.bottom} />
        <ResizeCornerStyle bottom left onClick={() => updateZIndex(uuid)} ref={rr?.bottomLeft} />
        <ResizeCornerStyle left onClick={() => updateZIndex(uuid)} ref={rr?.topLeft} top />
        <ResizeCornerStyle bottom onClick={() => updateZIndex(uuid)} ref={rr?.bottomRight} right />
        <ResizeCornerStyle onClick={() => updateZIndex(uuid)} ref={rr?.topRight} right top />
        <ResizeLeftStyle onClick={() => updateZIndex(uuid)} ref={rr?.left} />
        <ResizeRightStyle onClick={() => updateZIndex(uuid)} ref={rr?.right} />

        <OverlayStyle
          className={OVERLAY_ID}
          onClick={(e) => {
            e.stopPropagation();
            pauseEvent(e);
            restoreApplication(uuid);
          }}
        />

        <Header
          applications={getApplicationsFromCache({ uuid })}
          closeApplication={(uuidApp: ApplicationExpansionUUIDEnum) => closeApplication(uuidApp)}
          maximizeApplication={(uuidApp: ApplicationExpansionUUIDEnum) => {
            updateApplicationLayoutAndState(uuidApp, {
              layout: buildMaximumLayout(),
            }, {
              layout: true,
              state: false,
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
              startUpOptions={startUpOptions}
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
      uuid,
    }) => {
      if (StatusEnum.CLOSED === state?.status) {
        if (applicationConfiguration?.application) {
          closeApplication(uuid);
        } else {
          startApplication(applicationConfiguration, state);
        }
      }
    });
  }, []);

  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
    unregisterOnKeyUp,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(COMPONENT_UUID);
    unregisterOnKeyUp(COMPONENT_UUID);
  }, [unregisterOnKeyDown, unregisterOnKeyUp]);

  registerOnKeyDown(COMPONENT_UUID, (event, keyMapping) => {
    if (onlyKeysPresent([KEY_CODE_ALT_STRING, KEY_CODE_TAB], keyMapping)) {
      const uuidBottom = getOpenApplications({ ascending: true })?.[0]?.uuid;
      if (uuidBottom) {
        pauseEvent(event);
        updateZIndex(uuidBottom);
      }
    }
  }, []);

  return {
    closeApplication,
    renderApplications,
    startApplication,
  };
}
