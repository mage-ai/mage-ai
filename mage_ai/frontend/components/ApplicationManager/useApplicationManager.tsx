import { ThemeContext } from 'styled-components';
import { ThemeProvider } from 'styled-components';
import { createRef, useEffect, useContext, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import ArcaneLibrary from '@components/Applications/ArcaneLibrary';
import ArcaneLibraryConfiguration from '@components/Applications/ArcaneLibrary/configuration.json';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Header from './Header';
import KeyboardContext from '@context/Keyboard';
import PortalTerminal from '@components/Applications/PortalTerminal';
import VersionControlFileDiffs from '@components/VersionControlFileDiffs';
import useAutoResizer, { DimensionDataType, RectType } from '@utils/useAutoResizer';
import Button from '@oracle/elements/Button';
import { ExpandWindow, ExpandWindowFilled } from '@oracle/icons';
import useClickOutside from '@utils/useClickOutside';
import useDraggableElement from '@utils/useDraggableElement';
import Text from 'oracle/elements/Text';
import useResizeElement from '@utils/useResizeElement';
import { ApplicationConfiguration } from '@components/CommandCenter/constants';
import WithOnMount from '@components/shared/WithOnMount';
import { getIcon } from '@components/CommandCenter/ItemRow/constants';
import {
  BUTTON_STYLE_PROPS,
  ButtonStyle,
  HeaderStyle,
  getApplicationColors,
} from '@components/ApplicationManager/index.style';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
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
  buildGrid,
  inactiveLayouts,
} from '@storage/ApplicationManager/cache';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { selectEntriesWithValues, selectKeys } from '@utils/hash';
import { sortByKey } from '@utils/array';
import { useKeyboardContext } from '@context/Keyboard';
import { capitalize } from '@utils/string';

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

  const [currentApplications, setCurrentApplications] = useState({});

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
  const refDockedApps = useRef({});

  function getOpenApplications(
    {
      ascending,
    }: {
      ascending?: boolean;
    } = {
      ascending: false,
    },
  ): ApplicationManagerApplication[] {
    const apps = getApplicationsFromCache({ statuses: [StatusEnum.ACTIVE, StatusEnum.OPEN] })?.map(
      app => ({
        ...app,
        element: refExpansions?.current?.[app?.uuid],
      }),
    );

    return sortByKey(apps, ({ element }) => Number(element?.current?.style?.zIndex || 0), {
      ascending,
    });
  }

  function updateZIndex(uuid: ApplicationExpansionUUIDEnum) {
    let pick = null;
    const apps = [];
    getOpenApplications({
      ascending: true,
    })?.forEach(app => {
      if (app?.uuid === uuid) {
        pick = app;
      } else {
        apps.push(app);
      }
    });

    apps?.forEach(({ element, uuid: uuidApp }, idx: number) => {
      const z = DEFAULT_Z_INDEX + idx;
      if (element && element.current) {
        element.current.style.zIndex = z;
      }

      updateApplicationLayoutAndState(
        uuidApp,
        {
          layout: {
            position: {
              z,
            },
          },
        },
        {
          layout: true,
          state: false,
        },
      );
    });

    if (pick?.element?.current) {
      const z = DEFAULT_Z_INDEX + (apps?.length || 0);
      pick.element.current.style.zIndex = z;
      updateApplicationLayoutAndState(
        uuid,
        {
          layout: {
            position: {
              z,
            },
          },
        },
        {
          layout: true,
          state: false,
        },
      );
    }
  }

  function onResizeCallback(
    uuid: ApplicationExpansionUUIDEnum,
    data: DimensionDataType,
    elementRect: RectType,
  ): void {
    const app = getApplicationsFromCache({ uuid })?.[0];

    if ([StatusEnum.ACTIVE, StatusEnum.OPEN].includes(app?.state?.status)) {
      updateApplicationLayoutAndState(
        uuid,
        {
          layout: {
            dimension: selectEntriesWithValues(selectKeys(elementRect, ['height', 'width'])),
            position: selectEntriesWithValues(selectKeys(elementRect, ['x', 'y'])),
          },
        },
        {
          layout: true,
          state: false,
        },
      );
    }
  }

  const { deregisterElementUUIDs, observeThenResizeElements, setOnResize } = useAutoResizer();

  function closeApplication(uuid: ApplicationExpansionUUIDEnum) {
    closeApplicationFromCache(uuid);

    const refRoot = refRoots?.current?.[uuid];
    if (refRoot) {
      refRoots.current[uuid] = undefined;
      refRoot?.unmount();
    }

    deregisterElementUUIDs([uuid]);
  }

  function updateApplicationLayoutAndState(
    uuid: ApplicationExpansionUUIDEnum,
    opts?: {
      layout?: LayoutType;
      state?: StateType;
      updateElement?: (
        app: ApplicationManagerApplication,
        elementRef: React.RefObject<HTMLDivElement>,
      ) => void;
    },
    cache: {
      layout?: boolean;
      state?: boolean;
    } = {
      layout: true,
      state: true,
    },
  ): ApplicationManagerApplication {
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

    const appUpdated = updateApplication({
      ...data,
      uuid,
    });

    const refExpansion = refExpansions?.current?.[uuid];
    let refContainer = refContainers?.current?.[uuid];

    if (uuid === ApplicationExpansionUUIDEnum.ArcaneLibrary && !refContainer) {
      const arcaneLibraryContainerNode = document.getElementById(uuid);
      if (arcaneLibraryContainerNode) {
        refContainer = { current: arcaneLibraryContainerNode };
      }
    }

    if (refExpansion?.current) {
      if (opts?.updateElement) {
        opts?.updateElement?.(appUpdated, refExpansion);
      }
    }

    return appUpdated;
  }

  function changeApplicationStatus(
    uuidInit: ApplicationExpansionUUIDEnum,
    status: StatusEnum,
    opts: {
      all?: boolean;
      layout?: LayoutType;
      state?: StateType;
      updateElement?: (
        app: ApplicationManagerApplication,
        elementRef: React.RefObject<HTMLDivElement>,
      ) => void;
    } = {},
  ) {
    const app = getOpenApplications()?.find(({ uuid }) => uuid === uuidInit);
    const uuid = app?.uuid;
    updateApplicationLayoutAndState(
      uuid,
      {
        ...opts,
        state: {
          status,
        },
      },
      {
        layout: false,
        state: true,
      },
    );
  }

  function sharedApplication(
    status: StatusEnum,
    updateElement: (
      app: ApplicationManagerApplication,
      elementRef: React.RefObject<HTMLDivElement>,
    ) => void,
    uuid: ApplicationExpansionUUIDEnum,
    opts: { all?: boolean } = {},
  ) {
    changeApplicationStatus(uuid, status, {
      ...opts,
      updateElement: (appUpdated, element) => {
        if (appUpdated?.uuid === uuid) {
          element.current.style.display = 'block';
          if (updateElement) {
            updateElement(appUpdated, element);
          }

          const dockedElement = refDockedApps?.current?.[uuid];
          if (dockedElement?.current) {
            dockedElement.current.style.display = 'none';
          }
        }
      },
    });
  }

  function pauseApplication(uuid: ApplicationExpansionUUIDEnum, ...args) {
    sharedApplication(
      StatusEnum.INACTIVE,
      (appUpdated, element) => {
        const apps = getOpenApplications();
        const index = apps?.findIndex(a => a.uuid === appUpdated?.uuid);
        const napps = apps?.length || 1;
        const { dimension, position } = inactiveLayouts(Math.max(napps, 2), napps >= 2 ? index : 1);

        element.current.style.height = `${dimension?.height}px`;
        element.current.style.left = `${position?.x}px`;
        element.current.style.top = `${position?.y}px`;
        element.current.style.width = `${dimension?.width}px`;
        element.current.style.opacity = '0.3';
      },
      uuid,
      ...args,
    );
  }

  function restoreApplication(uuid: ApplicationExpansionUUIDEnum, ...args) {
    sharedApplication(
      StatusEnum.ACTIVE,
      (appUpdated, element) => {
        const apps = getOpenApplications();
        element.current.style.opacity = '1';

        if (appUpdated?.uuid === uuid) {
          const { dimension, position } = buildGrid(
            1,
            apps?.length || 1,
            0,
            (apps?.filter(a => StatusEnum.INACTIVE !== a?.state?.status)?.length || 1) - 1,
          );

          element.current.style.height = `${dimension?.height}px`;
          element.current.style.left = `${position?.x}px`;
          element.current.style.top = `${position?.y}px`;
          element.current.style.width = `${dimension?.width}px`;
        }
      },
      uuid,
      ...args,
    );
  }

  function openApplication(...args) {
    sharedApplication(
      StatusEnum.OPEN,
      (appUpdated, element) => {
        element.current.style.opacity = '1';
      },
      // @ts-ignore
      ...args,
    );
  }

  function maximizeApplication(uuid: ApplicationExpansionUUIDEnum, opts: { all?: boolean } = {}) {
    changeApplicationStatus(uuid, StatusEnum.ACTIVE, {
      ...opts,
      layout: buildMaximumLayout(),
      updateElement: (appUpdated, element) => {
        if (appUpdated?.uuid === uuid) {
          const { dimension, position } = appUpdated?.layout;

          element.current.style.height = `${dimension?.height}px`;
          element.current.style.left = `${position?.x}px`;
          element.current.style.top = `${position?.y}px`;
          element.current.style.width = `${dimension?.width}px`;
          element.current.style.display = 'block';
          element.current.style.opacity = '1';

          const dockedElement = refDockedApps?.current?.[uuid];
          if (dockedElement?.current) {
            dockedElement.current.style.display = 'none';
          }
        }
      },
    });
  }

  function minimizeApplication(uuid: ApplicationExpansionUUIDEnum, opts: { all?: boolean } = {}) {
    changeApplicationStatus(uuid, StatusEnum.MINIMIZED, {
      ...opts,
      updateElement: (appUpdated, element) => {
        if (appUpdated?.uuid === uuid) {
          element.current.style.display = 'none';
          element.current.style.opacity = '1';

          const dockedElement = refDockedApps?.current?.[uuid];
          if (dockedElement?.current) {
            dockedElement.current.style.display = 'block';
          }
        }
      },
    });
  }

  function onChangeLayoutPosition(
    uuid: ApplicationExpansionUUIDEnum,
    {
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
    },
  ) {
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
    const { clientX, clientY } = opts?.event || {
      clientX: null,
      clientY: null,
    };

    let height;
    let width;
    let x;
    let y;

    const percentageY = clientY / (typeof window === 'undefined' ? 0 : window.innerHeight);
    const percentageX = clientX / (typeof window === 'undefined' ? 0 : window.innerWidth);

    if (
      clientX <= APPLICATION_PADDING ||
      (typeof window !== 'undefined' && clientX + APPLICATION_PADDING >= window.innerWidth)
    ) {
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

      updateApplicationLayoutAndState(
        uuid,
        {
          layout: buildMaximumLayout(null, {
            height,
            width,
            x,
            y,
          }),
        },
        {
          layout: true,
          state: false,
        },
      );
    } else if (
      clientY <= APPLICATION_PADDING ||
      (typeof window !== 'undefined' && clientY + APPLICATION_PADDING >= window.innerHeight)
    ) {
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

      updateApplicationLayoutAndState(
        uuid,
        {
          layout: buildMaximumLayout(null, {
            height,
            width,
            x,
            y,
          }),
        },
        {
          layout: true,
          state: false,
        },
      );
    } else {
      onChangeLayoutPosition(uuid, opts);
    }
  }

  function onClickOutside(uuid: ApplicationExpansionUUIDEnum, isOutside: boolean, { group }) {
    const allOutside = Object.values(group || {})?.every(({ isOutside }) => isOutside);
    const apps = getOpenApplications();
    const app = apps?.find(a => uuid === a?.uuid);
    const status = app?.state?.status;

    if (apps?.some(a => StatusEnum.MINIMIZED === a?.state?.status)) {
      return;
    }

    if (!isOutside && StatusEnum.ACTIVE !== status) {
      restoreApplication(uuid);
    } else if (apps?.length >= 2) {
      if (
        allOutside &&
        apps?.some(a => [StatusEnum.ACTIVE, StatusEnum.OPEN].includes(a?.state?.status))
      ) {
        pauseApplication(uuid);
      }
    } else {
      if (
        allOutside &&
        apps?.some(a => [StatusEnum.ACTIVE, StatusEnum.OPEN].includes(a?.state?.status))
      ) {
        pauseApplication(uuid);
      }
    }
  }

  const { setElementObject: setElementObjectClickOutside } = useClickOutside({
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

  const { setElementObject, setInteractiveElementsObjects, setOnChange } = useDraggableElement();

  function renderApplications() {
    return (
      <>
        <DockStyle>
          {getApplicationsFromCache()?.map(({ applicationConfiguration, state, uuid }) => {
            if (!refDockedApps?.current) {
              refDockedApps.current = {};
            }

            const ref = refDockedApps?.current?.[uuid] || createRef();
            refDockedApps.current[uuid] = ref;

            const Icon = getIcon(applicationConfiguration?.item);

            return (
              <WithOnMount
                key={uuid}
                onMount={() => {
                  setTimeout(() => {
                    if (StatusEnum.MINIMIZED === state?.status) {
                      ref.current.style.display = 'block';
                    }
                  }, 1);
                }}
              >
                <MinimizedApplicationStyle
                  // onClick={(e) => {
                  //   e.stopPropagation();
                  //   e.preventDefault();
                  //   pauseEvent(e);
                  //   maximizeApplication(uuid);
                  // }}
                  ref={ref}
                  style={{
                    display: 'none',
                  }}
                >
                  <FlexContainer flexDirection="column" fullHeight fullWidth>
                    <HeaderStyle id={`${uuid}-header`} relative>
                      <FlexContainer alignItems="center" fullHeight>
                        <Spacing ml={1} />

                        {Icon && <Icon size={3 * UNIT} />}

                        <Spacing mr={1} />

                        <Flex flex={1}>
                          <Text>{applicationConfiguration?.item?.title}</Text>
                        </Flex>

                        <ButtonStyle {...BUTTON_STYLE_PROPS}>
                          <Button
                            iconOnly
                            noBackground
                            noBorder
                            noPadding
                            onClick={e => {
                              e.stopPropagation();
                              e.preventDefault();
                              pauseEvent(e);
                              maximizeApplication(uuid);
                            }}
                          >
                            <>
                              <div className="empty" style={{ display: 'none' }}>
                                <ExpandWindow size={2 * UNIT} success />
                              </div>
                              <div className="filled">
                                <ExpandWindowFilled size={2 * UNIT} success />
                              </div>
                            </>
                          </Button>
                        </ButtonStyle>

                        <Spacing ml={1} />
                      </FlexContainer>
                    </HeaderStyle>

                    <Spacing p={1}>
                      <Text default small>
                        {capitalize(applicationConfiguration?.item?.description || '')}
                      </Text>
                    </Spacing>
                  </FlexContainer>
                </MinimizedApplicationStyle>
              </WithOnMount>
            );
          })}
        </DockStyle>

        <RootApplicationStyle id={ROOT_APPLICATION_UUID} ref={refRootApplication}>
          {Object.keys(ApplicationExpansionUUIDEnum).map(uuid => {
            if (!refContainers?.current) {
              refContainers.current = {};
            }

            const ref = refContainers?.current?.[uuid] || createRef();
            refContainers.current[uuid] = ref;

            return (
              <ApplicationMountStyle id={uuid} key={`${uuid}-${statusMapping?.[uuid]}`} ref={ref} />
            );
          })}
        </RootApplicationStyle>
      </>
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

    const { application } = applicationConfiguration;
    const { expansion_settings: expansionSettings } = application;
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

    const { layout, state } = updateApplication({
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
      dimension: { height, width },
      position: { x, y, z },
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
      setResizableObject(uuid, ref, {
        tries: 10,
      });
      setResizersObjects(
        uuid,
        [
          rr?.bottom,
          rr?.bottomLeft,
          rr?.bottomRight,
          rr?.left,
          rr?.right,
          rr?.topLeft,
          rr?.topRight,
        ],
        {
          tries: 10,
        },
      );
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

    const expansion = (
      <ContainerStyle
        id={`${uuid}-container`}
        onClick={() => updateZIndex(uuid)}
        ref={ref}
        style={{
          display: 'none',
          height,
          left: x,
          top: y,
          width,
          zIndex: (getOpenApplications()?.[0]?.layout?.position?.z || z) + 1,
        }}
      >
        <ResizeBottomStyle onClick={() => updateZIndex(uuid)} ref={rr?.bottom} />
        <ResizeCornerStyle bottom left onClick={() => updateZIndex(uuid)} ref={rr?.bottomLeft} />
        <ResizeCornerStyle left onClick={() => updateZIndex(uuid)} ref={rr?.topLeft} top />
        <ResizeCornerStyle bottom onClick={() => updateZIndex(uuid)} ref={rr?.bottomRight} right />
        <ResizeCornerStyle onClick={() => updateZIndex(uuid)} ref={rr?.topRight} right top />
        <ResizeLeftStyle onClick={() => updateZIndex(uuid)} ref={rr?.left} />
        <ResizeRightStyle onClick={() => updateZIndex(uuid)} ref={rr?.right} />

        <OverlayStyle
          className={OVERLAY_ID}
          onClick={e => {
            maximizeApplication(uuid);
          }}
        />

        <Header
          applications={getApplicationsFromCache({ uuid })}
          closeApplication={(uuidApp: ApplicationExpansionUUIDEnum) => closeApplication(uuidApp)}
          maximizeApplication={(uuidApp: ApplicationExpansionUUIDEnum) => {
            maximizeApplication(uuidApp);
          }}
          minimizeApplication={(uuidApp: ApplicationExpansionUUIDEnum) => {
            minimizeApplication(uuidApp);
          }}
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
              onChangeState={prev => {
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
              <WithOnMount
                onMount={() => {
                  setTimeout(() => {
                    if (StatusEnum.MINIMIZED === state?.status) {
                      minimizeApplication(uuid);
                    } else {
                      ref.current.style.display = 'block';
                    }
                  }, 1);
                }}
              >
                {expansion}
              </WithOnMount>
            </ErrorProvider>
          </ModalProvider>
        </ThemeProvider>
      </KeyboardContext.Provider>,
    );
  }

  useEffect(() => {
    getApplicationsFromCache().forEach(({ applicationConfiguration, state, uuid }) => {
      if (applicationConfiguration?.application) {
        if (StatusEnum.CLOSED === state?.status) {
          closeApplication(uuid);
        } else {
          startApplication(applicationConfiguration, state);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { registerOnKeyDown, unregisterOnKeyDown, unregisterOnKeyUp } = useKeyboardContext();

  useEffect(
    () => () => {
      unregisterOnKeyDown(COMPONENT_UUID);
      unregisterOnKeyUp(COMPONENT_UUID);
    },
    [unregisterOnKeyDown, unregisterOnKeyUp],
  );

  registerOnKeyDown(
    COMPONENT_UUID,
    (event, keyMapping) => {
      if (onlyKeysPresent([KEY_CODE_ALT_STRING, KEY_CODE_TAB], keyMapping)) {
        const uuidBottom = getOpenApplications({ ascending: true })?.[0]?.uuid;
        if (uuidBottom) {
          pauseEvent(event);
          updateZIndex(uuidBottom);
        }
      }
    },
    [],
  );

  return {
    closeApplication,
    renderApplications,
    startApplication,
  };
}
