import { createRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import ApplicationHeaderTitle from './ApplicationHeaderTitle';
import ApplicationFooter from './ApplicationFooter';
import Button from '@oracle/elements/Button';
import Footer from './Footer';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import ItemApplication from './ItemApplication';
import ItemOutput from './ItemOutput';
import ItemRow from './ItemRow';
import LaunchKeyboardShortcutText from './LaunchKeyboardShortcutText';
import Loading from '@oracle/components/Loading';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import useApplicationManager from '@components/ApplicationManager/useApplicationManager';
import useCache from '@storage/CommandCenter/useCache';
import useExecuteActions from './useExecuteActions';
import useInvokeRequest from './useInvokeRequest';
import {
  APPLICATION_FOOTER_ID,
  ApplicationContainerStyle,
  ApplicationFooterStyle,
  COMPONENT_UUID,
  ContainerStyle,
  FOOTER_ID,
  FooterStyle,
  FooterWraperStyle,
  HEADER_ID,
  HEADER_TITLE_ID,
  HeaderContainerStyle,
  HeaderStyle,
  HeaderTitleStyle,
  INPUT_CONTAINER_ID,
  ITEMS_CONTAINER_UUID,
  ITEM_CONTEXT_CONTAINER_ID,
  InputContainerStyle,
  InputStyle,
  ItemsContainerStyle,
  KeyboardShortcutStyle,
  LoadingStyle,
  MAIN_TEXT_INPUT_ID,
  OUTPUT_CONTAINER_ID,
  OutputContainerStyle,
  SHARED_PADDING,
} from './index.style';
import { ArrowLeft } from '@oracle/icons';
import {
  CommandCenterActionInteractionTypeEnum,
  CommandCenterActionRequestType,
  CommandCenterActionType,
  CommandCenterItemType,
  CommandCenterStateEnum,
  ItemApplicationType,
  ItemApplicationTypeEnum,
  ItemTypeEnum,
  ModeType,
  ModeTypeEnum,
  KeyValueType,
  ObjectTypeEnum,
  getButtonLabel,
  ApplicationExpansionUUIDEnum,
} from '@interfaces/CommandCenterType';
import {
  CUSTOM_EVENT_NAME_COMMAND_CENTER_OPEN,
  CUSTOM_EVENT_NAME_COMMAND_CENTER_STATE_CHANGED,
} from '@utils/events/constants';
import {
  KEY_CODE_ARROW_DOWN,
  KEY_CODE_ARROW_LEFT,
  KEY_CODE_ARROW_RIGHT,
  KEY_CODE_ARROW_UP,
  KEY_CODE_BACKSPACE,
  KEY_CODE_C,
  KEY_CODE_CONTROL,
  KEY_CODE_DELETE,
  KEY_CODE_ENTER,
  KEY_CODE_ESCAPE,
  KEY_CODE_KEY_SYMBOL_MAPPING,
  KEY_CODE_META_LEFT,
  KEY_CODE_META_RIGHT,
  KEY_CODE_PERIOD,
  KEY_SYMBOL_ESCAPE,
} from '@utils/hooks/keyboardShortcuts/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { ApplicationConfiguration, ExecuteActionableType, InputElementEnum, ItemRowClassNameEnum, getInputPlaceholder } from './constants';
import { InvokeRequestActionType, InvokeRequestOptionsType } from './ItemApplication/constants';
import { OperationTypeEnum } from '@interfaces/PageComponentType';
import { addClassNames, removeClassNames } from '@utils/elements';
import {
  addPickHistory,
  addSearchHistory,
  combineUnique,
  getCurrentMode,
  getSearchHistory,
  getSetSettings,
  setMode,
} from '@storage/CommandCenter/utils';
import { addCachedItems, getCachedItems } from '@storage/CommandCenter/cache';
import {
  executeButtonActions,
  filterItems,
  getCurrentApplicationForItem,
  interpolatePagePath,
  rankItems,
  updateActionFromUpstreamResults,
} from './utils';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { mergeDeep, setNested } from '@utils/hash';
import { sum } from '@utils/array';
import { useError } from '@context/Error';
import { useKeyboardContext } from '@context/Keyboard';

function CommandCenter({
  router: routerProp,
}: {
  router?: any;
}) {
  const router = routerProp || useRouter();
  const [showError, _, refError] = useError(null, {}, [], {
    uuid: COMPONENT_UUID,
  });

  const commandCenterStateRef = useRef({});

  const refAbortController = useRef(null);
  const refAbortControllerRequest = useRef(null);

  const refActive = useRef(false);
  const refFocusedElement = useRef(null);
  const refReload = useRef(null);
  const refSettings = useRef(null);

  const refContainer = useRef(null);

  const refRootHeaderTitle = useRef(null);
  const refHeader = useRef(null);
  const refHeaderTitle = useRef(null);

  const refLoading = useRef(null);
  const refLoadingRequest = useRef(null);
  const refInput = useRef(null);
  const refInputKeyboardShortcut = useRef(null);
  const refInputValuePrevious = useRef(null);
  const refFetchCount = useRef(0);

  const refFooter = useRef(null);
  const refFooterButtonEnter = useRef(null);
  const refFooterButtonEscape = useRef(null);
  const refFooterButtonUp = useRef(null);

  const refRootOutputContainer = useRef(null);
  const refOutputContainer = useRef(null);
  const refOutputContainerState = useRef(null);

  const refRootItems = useRef(null);
  const refItems = useRef([]);
  const refItemsInit = useRef(null);
  const refItemsApplicationDetailList = useRef(null);
  const refItemsNodes = useRef({});
  const refItemsNodesContainer = useRef(null);

  const refItemsActionResults = useRef({});
  function getItemsActionResults(): KeyValueType {
    return refItemsActionResults?.current;
  }
  function getItems(): CommandCenterItemType[] {
    return refItems?.current;
  }

  const refFocusedItemIndex = useRef(null);
  const refFocusedSearchHistoryIndex = useRef(null);
  const refSelectedSearchHistoryIndex = useRef(null);

  const refRootApplications = useRef(null);
  const refRootApplicationsFooter = useRef(null);
  const refApplications = useRef(null);
  const refApplicationsNodesContainer = useRef(null);
  const refApplicationsFooter = useRef(null);
  const refApplicationState = useRef(null);

  function startLoading() {
    if (refLoading?.current) {
      refLoading.current.className = removeClassNames(
        refLoading?.current?.className || '',
        [
          'inactive',
        ],
      );
    }
  }

  function stopLoading() {
    if (refLoading?.current) {
      refLoading.current.className = addClassNames(
        refLoading?.current?.className || '',
        [
          'inactive',
        ],
      );
    }
  }

  function getCurrentApplicationConfiguration(): ApplicationConfiguration {
    return refApplications?.current?.[0];
  }

  function isCurrentApplicationDetailList(
    applicationConfigurationToCheck: ApplicationConfiguration = null,
  ): boolean {
    return [
      ItemApplicationTypeEnum.LIST,
      ItemApplicationTypeEnum.DETAIL_LIST,
    ].includes((
      applicationConfigurationToCheck || getCurrentApplicationConfiguration()
    )?.application?.application_type);
  }

  function toggleClassNames(classNamesIn: string[], classNamesOut: string[], refsArray: any[]) {
    refsArray.forEach((r) => {
      if (r?.current) {
        r.current.className = addClassNames(
          r?.current?.className || '',
          classNamesIn,
        );
        r.current.className = removeClassNames(
          r?.current?.className || '',
          classNamesOut,
        );
      }
    });
  }

  function activateClassNamesForRefs(refsArray: any[], reverse: boolean = false) {
    toggleClassNames(
      [
        reverse ? 'inactive' : 'active',
      ],
      [
        reverse ? 'active' : 'inactive',
      ],
      refsArray,
    );
  }

  function addHeaderTitle() {
    // Header title
    if (!refRootHeaderTitle?.current) {
      const domNode = document.getElementById(HEADER_TITLE_ID);
      refRootHeaderTitle.current = createRoot(domNode);
    }
    const currentApplicationConfig = getCurrentApplicationConfiguration();

    refRootHeaderTitle?.current?.render(
      <ApplicationHeaderTitle
        application={currentApplicationConfig?.application}
        applicationsRef={refApplications}
        item={currentApplicationConfig?.item}
      />
    );

    activateClassNamesForRefs([refHeaderTitle]);
  }

  function removeHeaderTitle() {
    if (refHeaderTitle?.current !== null) {
      activateClassNamesForRefs([refHeaderTitle], true);
    }
  }

  function updateInputProperties() {
    const currentApplicationConfig = getCurrentApplicationConfiguration();
    if (refInput?.current) {
      refInput.current.value = '';
      refInput.current.placeholder = getInputPlaceholder(currentApplicationConfig);
    }
  }

  function onChangeState(prev: (data: any) => any) {
    refApplicationState.current = prev(refApplicationState?.current);
  }

  const {
    closeApplication,
    renderApplications,
    startApplication,
  } = useApplicationManager({
    applicationState: refApplicationState,
    onChangeState,
  });

  function resetViewForNewTransition() {
    refInput.current.value = '';
    refItems.current = null;
    refItemsInit.current = null;
    updateInputProperties();
  }

  function addApplication(
    applicationConfiguration: {
      application: ItemApplicationType;
      focusedItemIndex: number;
      item: CommandCenterItemType;
      itemsRef?: any;
    } & InvokeRequestActionType & ExecuteActionableType,
    opts: {
      skipAdding?: boolean;
    } = {
      skipAdding: false,
    }) {
    const currentApplicationConfig = { ...applicationConfiguration };

    if (!opts?.skipAdding) {
      if (refApplications?.current === null) {
        refApplications.current = [];
      }

      const app = getCurrentApplicationForItem(
        currentApplicationConfig?.item,
        refApplications?.current || [],
        {
          beforeAddingNextApplication: true,
        },
      );

      if (app) {
        currentApplicationConfig.application = app;

        // @ts-ignore
        refApplications.current = [currentApplicationConfig].concat(refApplications.current || []);
      }
    }

    const {
      application,
      item,
    } = currentApplicationConfig;

    const activeApplicationsCount = refApplications?.current?.length || 0;

    if (ItemApplicationTypeEnum.EXPANSION === application?.application_type) {
      startApplication(currentApplicationConfig);
      fetchItems({
        exclude: [
          item?.uuid,
        ],
        refresh: true,
      });
      resetViewForNewTransition();
    } else if ([
    // Detail, Form
      ItemApplicationTypeEnum.DETAIL,
      ItemApplicationTypeEnum.FORM,
    ].includes(application?.application_type)) {
      activateClassNamesForRefs([
        refHeader,
        refInput,
        refInputKeyboardShortcut,
        refApplicationsNodesContainer,
        refItemsNodesContainer,
        refFooter,
        refApplicationsFooter,
      ]);

      // Application
      if (!refRootApplications?.current) {
        const domNode = document.getElementById(ITEM_CONTEXT_CONTAINER_ID);
        refRootApplications.current = createRoot(domNode);
      }

      refRootApplications?.current?.render(
        <ItemApplication
          {...currentApplicationConfig}
          applicationState={refApplicationState}
          applicationsRef={refApplications}
          closeCommandCenter={closeCommandCenter}
          fetchItems={fetchItems}
          getItemsActionResults={getItemsActionResults}
          handleSelectItemRow={handleSelectItemRow}
          refError={refError}
          removeApplication={removeApplication}
          router={router}
          showError={showError}
        />
      );

      addHeaderTitle();
    } else if (isCurrentApplicationDetailList(currentApplicationConfig)) {
      renderItems([
        item,
      ]);

      fetchItems({
        search: null,
      });

      if (refApplications?.current?.length >= 2) {
        addHeaderTitle();
      }

      activateClassNamesForRefs([
        refHeader,
      ]);

      updateInputProperties();
    }

    activateClassNamesForRefs([
      refApplicationsFooter,
      refFooter,
    ]);

    // Footer for application
    if (!refRootApplicationsFooter?.current) {
      const domNode = document.getElementById(APPLICATION_FOOTER_ID);
      refRootApplicationsFooter.current = createRoot(domNode);
    }

    refRootApplicationsFooter?.current?.render(
      <ApplicationFooter
        {...currentApplicationConfig}
        applicationState={refApplicationState}
        applicationsRef={refApplications}
        closeCommandCenter={closeCommandCenter}
        closeOutput={closeOutput}
        fetchItems={fetchItems}
        getItemsActionResults={getItemsActionResults}
        handleSelectItemRow={handleSelectItemRow}
        refError={refError}
        removeApplication={removeApplication}
        router={router}
      />
    );
  }

  function removeApplication(opts?: {
    application?: ItemApplicationType;
  }) {
    if (ItemApplicationTypeEnum.EXPANSION === opts?.application?.application_type) {
      closeApplication(opts?.application?.uuid as ApplicationExpansionUUIDEnum);
    }

    const count = refApplications?.current?.length || 0;

    if (refApplications?.current === null || !count) {
      return;
    }

    const removedApplicationConfig = refApplications.current?.[0] || {};
    refApplications.current = refApplications?.current?.slice(1, count);

    function resetClassNames() {
      activateClassNamesForRefs([
        refHeader,
        refHeaderTitle,
        refInput,
        refInputKeyboardShortcut,
        refItemsNodesContainer,
        refApplicationsNodesContainer,
        refFooter,
        refApplicationsFooter,
      ], true);

      refInput?.current?.setSelectionRange(0, refInput?.current?.value?.length);
      refInput?.current?.focus();
    }

    let resetCallback;
    let shouldReset = count === 1;

    if (count >= 2) {
      // Remove the next application from the stack, then re-add it so that all the
      // class name handling is triggered.
      const currentApplicationConfig = refApplications.current?.[0] || {};

      if (isCurrentApplicationDetailList(currentApplicationConfig)) {
        resetClassNames();
      }

      removeHeaderTitle();

      addApplication(currentApplicationConfig, {
        skipAdding: true,
      });
    } else if (count === 1) {
      resetClassNames();

      if (isCurrentApplicationDetailList(removedApplicationConfig)) {
        refItemsApplicationDetailList.current = null;
        fetchItems();
      }
    }
  }

  function isApplicationActive(): boolean {
    return refApplications?.current?.length >= 1;
  }

  const refKeyDownCode = useRef(null);

  const [reload, setReload] = useState(null);

  function getCurrentFocusedItem(): CommandCenterItemType {
    const indexPrev = refFocusedItemIndex?.current;
    if (indexPrev !== null) {
      return refItems?.current?.[indexPrev];
    }
  }

  function getCurrentFocusedNode(): any {
    const itemPrev = getCurrentFocusedItem();

    if (itemPrev !== null) {
      return refItemsNodes?.current?.[itemPrev?.uuid]?.current;
    }
  }

  function removeFocusFromCurrentItem(currentNode: any = null) {
    const nodePrev = currentNode || getCurrentFocusedNode();
    if (nodePrev) {
      nodePrev.className = removeClassNames(
        nodePrev?.className || '',
        [
          'focused',
        ],
      );
    }
  }

  function handleNavigation(index: number, opts: {
    disableFocusRemoval?: boolean;
  } = {}) {
    const itemsContainer = refItemsNodesContainer?.current;
    // 400
    const itemsContainerHeight =
      itemsContainer?.getBoundingClientRect()?.height - (SHARED_PADDING * 2);
    // 44 * 14 = 616
    const itemRowHeightTotal = sum(Object.values(
      refItemsNodes?.current || {},
      // @ts-ignore
    )?.map(refItem => refItem?.current?.getBoundingClientRect()?.height || 0));
    // 216
    const scrollTopTotal = itemRowHeightTotal - itemsContainerHeight;
    // 0 -> 216
    const currentScrollTop = itemsContainer?.scrollTop;

    if (index !== null) {
      const item = refItems?.current?.[index];
      let nodeYBottom = 0;
      let nodeYTop = 0;

      refItems?.current?.slice(0, index + 1)?.forEach((itemInner, idx: number) => {
        const nodeInner = refItemsNodes?.current?.[itemInner?.uuid]?.current;
        const nodeHeight = nodeInner?.getBoundingClientRect()?.height || 0;

        nodeYBottom += nodeHeight;
        nodeYTop += nodeHeight;

        if (idx === index) {
          nodeYTop -= nodeHeight;
        }
      });

      let diff = null;

      // Scroll into view if the node is not currently in the ItemsContainer view.
      if (nodeYBottom > itemsContainerHeight + currentScrollTop) {
        diff = nodeYBottom - itemsContainerHeight;
      } else if (nodeYTop < currentScrollTop) {
        diff = currentScrollTop - (currentScrollTop - nodeYTop);
      }

      if (diff !== null) {
        itemsContainer.scrollTop = Math.max(diff, 0);
      }

      let isSameItem = false;
      const itemNext = refItems?.current?.[index];

      if (!opts?.disableFocusRemoval && refFocusedItemIndex?.current !== null) {
        const itemPrev = refItems?.current?.[refFocusedItemIndex?.current];
        isSameItem = itemNext?.uuid === itemPrev?.uuid;
        if (!isSameItem) {
          removeFocusFromCurrentItem();
        }
      }

      refFocusedItemIndex.current = index;
      const nodeNext = refItemsNodes?.current?.[itemNext?.uuid]?.current;
      if (nodeNext) {
        if (!nodeNext?.className?.includes('focused')) {
          nodeNext.className = addClassNames(
            nodeNext?.className || '',
            [
              'focused',
            ],
          );
        }
      }

      // Reset this in case it was never reset.
      if (refFocusedSearchHistoryIndex?.current === null && refSelectedSearchHistoryIndex?.current !== null) {
        refSelectedSearchHistoryIndex.current = null;
      }

      if (refFooterButtonUp?.current) {
        if (index === 0
          && refFocusedSearchHistoryIndex?.current === null
          && refSelectedSearchHistoryIndex.current === null
        ) {
          refFooterButtonUp.current.innerText = 'Recent';
        } else {
          refFooterButtonUp.current.innerText = 'Up';
        }
      }

      if (refFooterButtonEscape?.current) {
        if (refFocusedSearchHistoryIndex?.current !== null
          || refSelectedSearchHistoryIndex.current !== null
        ) {
          refFooterButtonEscape.current.innerText = 'All';
        } else if (refApplications?.current !== null) {
          refFooterButtonEscape.current.innerText = 'Back';
        } else {
          refFooterButtonEscape.current.innerText = 'Close';
        }
      }

      if (refFooterButtonEnter?.current) {
        if (item) {
          refFooterButtonEnter.current.innerText = getButtonLabel(item) || 'Select';
        } else {
          refFooterButtonEnter.current.innerText = 'Select';
        }
      }
    }
  }

  function onRequestFinish() {
    refLoadingRequest.current = false;
    stopLoading();
  }

  const {
    invokeRequest: invokeRequestInit,
  } = useInvokeRequest({
    onSuccessCallback: (
      value,
      {
        action,
        focusedItemIndex,
        item,
      },
    ) => {
      setNested(
        refItemsActionResults.current,
        item?.object_type,
        [
          {
            action,
            item,
            value,
          },
        ],
      );
      getItemsActionResults();
      onRequestFinish();
    },
    showError,
  });

  function invokeRequest(opts) {
    const abortController = new AbortController();
    const {
      action,
      item,
    } = opts;
    const currentOpts = {
      ...opts,
    };

    if (ObjectTypeEnum.BRANCH === item?.object_type
      && ItemTypeEnum.ACTION === item?.item_type
      && action?.uuid?.includes('push')
    ) {
      setTimeout(() => {
        abortController.abort();
        onRequestFinish();
        showError({
          errors: {
            messages: [
              `Request timed out for ${currentOpts?.item?.title}.`,
            ],
          },
        });
      }, 7000);
    }

    refLoadingRequest.current = true;
    startLoading();

    return invokeRequestInit({
      ...opts,
      abortController,
    });
  }

  function handleSelectItemRowBase(
    item: CommandCenterItemType,
    focusedItemIndex: number,
    fallbackCallback?: (item: CommandCenterItemType, focusedItemIndex: number) => void,
  ) {
    addPickHistory(item);

    const searchText = refInput?.current?.value;
    if (searchText?.length >= 1) {
      addSearchHistory(searchText, item, refItems?.current);
    }

    const applicationsCount = item?.applications?.length || 0;
    const mode = getCurrentMode();

    if (ItemTypeEnum.MODE_DEACTIVATION === item?.item_type && mode) {
      deactivateMode();
    } else if (ItemTypeEnum.MODE_ACTIVATION === item?.item_type  && !mode && item?.mode?.type) {
      activateMode(item);
    } else if (applicationsCount >= 1) {
      // What was this used for in the conditional statement? isCurrentApplicationDetailList()
      // If the selected item has an application, add it.

      addApplication({
        application: null,
        item,
        executeAction,
        focusedItemIndex,
        invokeRequest,
        itemsRef: refItems,
      });

      // Don’t try to execute the action or else selecting the row will add the application
      // AND select the row which will then execute the action associated with it.
      // if (item?.actions?.length >= 1) {
      //   executeAction(item, focusedItemIndex).then(() => add());
      // } else {
      //   add();
      // }

    } else if (fallbackCallback) {
      fallbackCallback?.(item, focusedItemIndex);
    }
  }

  function closeOutput() {
    activateClassNamesForRefs([refOutputContainer], true);
    toggleClassNames(['output-inactive'], ['output-active'], [
      refApplicationsFooter,
      refFooter,
    ]);
    toggleClassNames(['inactive'], ['active'], [
      refOutputContainer,
    ]);
    refOutputContainerState.current = null;
  }

  function openOutput() {
    activateClassNamesForRefs([refOutputContainer]);
    toggleClassNames(['output-active'], ['output-inactive'], [
      refApplicationsFooter,
      refFooter,
    ]);
    toggleClassNames(['aactive'], ['inactive'], [
      refOutputContainer,
    ]);
  }

  function renderOutput({
    item,
    action,
    results,
  }: {
    item?: CommandCenterItemType;
    action?: CommandCenterActionType;
    results?: KeyValueType;
  }) {
    refOutputContainerState.current = {
      item,
      action,
      results,
      actionResults: {
        ...(refItemsActionResults?.current || {}),
      },
    };

    if (!refRootOutputContainer?.current) {
      const domNode = document.getElementById(OUTPUT_CONTAINER_ID);
      refRootOutputContainer.current = createRoot(domNode);
    }

    refRootOutputContainer?.current?.render(
      <ItemOutput
        {...refOutputContainerState.current}
      />
    );

    openOutput();
  }

  const executeAction = useExecuteActions({
    applicationState: refApplicationState,
    closeCommandCenter,
    commandCenterState: commandCenterStateRef,
    fetchItems,
    getItems,
    handleSelectItemRow: handleSelectItemRowBase,
    invokeRequest,
    itemsActionResultsRef: refItemsActionResults,
    removeApplication,
    renderOutput,
    router,
  });

  function handleSelectItemRow(
    item: CommandCenterItemType,
    focusedItemIndex: number,
    fallbackCallback?: (item: CommandCenterItemType, focusedItemIndex: number) => void,
  ) {
    return handleSelectItemRowBase(
      item,
      focusedItemIndex,
      fallbackCallback ? fallbackCallback : (i, f) => executeAction(i, f),
    )
  }

  function renderItems(
    items: CommandCenterItemType[],
    opts: {
      shouldFilter?: boolean;
    } = {},
  ): Promise<any> {
    const currentFocusedItem = getCurrentFocusedItem();
    const currentFocusedNode = getCurrentFocusedNode();

    refItems.current = rankItems(opts?.shouldFilter
      ? filterItems(refInput?.current?.value, items)
      : items
    );

    if (!refRootItems?.current) {
      const domNode = document.getElementById(ITEMS_CONTAINER_UUID);
      refRootItems.current = createRoot(domNode);
    }

    const nextFocusedItem = refItems?.current?.[0];
    // If the 1st item in the items that are about to rendered isn’t the same as the
    // previously focused item, remove the focused class from its node.
    if (currentFocusedNode && nextFocusedItem?.uuid !== currentFocusedItem?.uuid) {
      removeFocusFromCurrentItem(currentFocusedNode);
    }

    if (refFocusedItemIndex?.current !== 0) {
      refFocusedItemIndex.current = 0;
    }

    const itemsEl = refItems?.current?.map((item: CommandCenterItemType, index: number) => {
      const refItem = refItemsNodes?.current?.[item?.uuid] || createRef();
      refItemsNodes.current[item?.uuid] = refItem;
      const className = [String(ItemRowClassNameEnum.ITEM_ROW)];
      if (index === 0) {
        className.push('focused');
      }

      return (
        <ItemRow
          className={className.join(' ')}
          item={item}
          key={item.uuid}
          onClick={(e) => {
            pauseEvent(e);
            if (refFocusedItemIndex?.current === index) {
              handleSelectItemRow(item, index);
            } else {
              handleNavigation(index);
            }

            refInput?.current?.focus();
          }}
          ref={refItem}
        />
      );
    });

    refRootItems?.current?.render(itemsEl);
    handleNavigation(0, {
      disableFocusRemoval: true,
    });

    return new Promise((resolve, reject) => resolve?.(refItems?.current));
  }

  function toggleMode(mode?: ModeType) {
    setMode(mode);
    resetViewForNewTransition();
    renderItems([]);
    fetchItems();

    if (mode) {
      refContainer.current.className = addClassNames(
        refContainer?.current?.className || '',
        [
          mode?.type,
        ],
      );
    }

    refContainer.current.className = removeClassNames(
      refContainer?.current?.className || '',
      [
        'hide',
      ],
    );
  }

  function deactivateMode() {
    toggleMode(null);
  }

  function activateMode(item: CommandCenterItemType) {
    toggleMode(item?.mode);
  }

  const {
    fetch: fetchItemsInit,
    isLoading: isLoadingFetch,
  } = useCache(() => {
    const count = (refFetchCount?.current || 0) + 1;
    refFetchCount.current = count;
    return count;
  }, {
    abortControllerRef: refAbortController,
    onSuccessCallback: (
      {
        command_center_item,
      },
      {
        disableRenderingCache,
        exclude,
        refresh,
        uuid,
      }: {
        disableRenderingCache?: boolean;
        exclude?: string[];
        refresh?: boolean;
        uuid: number | string;
      },
    ) => {
      const match = refFetchCount?.current === uuid;
      if (match || refresh) {
        const items = addCachedItems(
          command_center_item?.items || [],
          {
            filterCachedItems: cachedItems => !disableRenderingCache && filterItems(
              refInput?.current?.value,
              cachedItems,
            ),
          },
        );

        if (match) {
          if (refItemsInit?.current === null) {
            refItemsInit.current = items;
          }

          if (isCurrentApplicationDetailList() && refItemsApplicationDetailList?.current === null) {
            refItemsApplicationDetailList.current = items;
          }
        }

        refSettings.current = getSetSettings(command_center_item?.settings || {});
        renderItems(items);
      }
    },
    onErrorCallback: (response, errors) => showError({
      errors,
      response,
    }),
    searchRef: refInput,
  });

  function fetchItems(opts = {}) {
    let fetchOptions = { ...opts };

    const currentApplicationConfig = getCurrentApplicationConfiguration();
    if (isCurrentApplicationDetailList(currentApplicationConfig)) {
      fetchOptions = mergeDeep({
        disableRenderingCache: true,
      }, currentApplicationConfig, fetchOptions);
    }

    return fetchItemsInit(fetchOptions);
  }

  useEffect(() => {
    if (isLoadingFetch) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [
    isLoadingFetch,
  ]);

  function abortRequests() {
    [refAbortController, refAbortControllerRequest].forEach((controller) => {
      if (controller?.current) {
        controller?.current?.abort();
      }
    });
  }

  function closeCommandCenter() {
    refContainer.current.className = addClassNames(
      refContainer?.current?.className || '',
      [
        'hide',
      ],
    );

    refFocusedElement.current = null;
    refInput?.current?.blur();
    refActive.current = false;

    // Reset the items to the original list of items.
    stopLoading();
    abortRequests();

    if (typeof window !== 'undefined') {
      const eventCustom = new CustomEvent(CUSTOM_EVENT_NAME_COMMAND_CENTER_STATE_CHANGED, {
        detail: {
          state: CommandCenterStateEnum.CLOSED,
        },
      });
      window.dispatchEvent(eventCustom);
    }
  }

  function openCommandCenter() {
    refContainer.current.className = removeClassNames(
      refContainer?.current?.className || '',
      [
        'hide',
      ],
    );

      // Show the command center and focus on the text input.
    refInput?.current?.focus();
    refActive.current = true;

    if (refItems?.current?.length >= 1) {
      if (refFocusedItemIndex?.current === null) {
        handleNavigation(0);
      }
    } else {
      fetchItems();
    }

    stopLoading();
    abortRequests();

    if (typeof window !== 'undefined') {
      const eventCustom = new CustomEvent(CUSTOM_EVENT_NAME_COMMAND_CENTER_STATE_CHANGED, {
        detail: {
          state: CommandCenterStateEnum.OPEN,
        },
      });
      window.dispatchEvent(eventCustom);
    }
  }

  const {
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    registerOnKeyUp,
    unregisterOnKeyDown,
    unregisterOnKeyUp,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(COMPONENT_UUID);
    unregisterOnKeyUp(COMPONENT_UUID);
  }, [unregisterOnKeyDown, unregisterOnKeyUp, COMPONENT_UUID]);

  registerOnKeyUp(COMPONENT_UUID, (keyMapping) => {
    refKeyDownCode.current = null;
  }, []);

  registerOnKeyDown(COMPONENT_UUID, (event, keyMapping, keyHistory) => {
    function startSequenceValid(): boolean {
      const ks = getSetSettings(refSettings?.current || {})?.interface?.keyboard_shortcuts?.main?.filter(k => k?.length >= 1);

      if (ks?.length >= 1) {
        return ks?.every(k => keyMapping?.[k]);
      } else {
        return [KEY_CODE_META_RIGHT, KEY_CODE_PERIOD].every(k => keyMapping?.[k])
          || [KEY_CODE_META_LEFT, KEY_CODE_PERIOD].every(k => keyMapping?.[k]);
      }

      return false;
    }

    // Doesn’t work
    // if (commandCenterStateRef?.current?.disableKeyboardShortcuts) {
    //   return;
    // }

    let stopHandling = false;

    if (startSequenceValid()) {
      pauseEvent(event);
      if (!!refActive?.current) {
        closeCommandCenter();
      } else {
        openCommandCenter();
      }
    }

    if (!refActive?.current) {
      return;
    }

    if (refOutputContainerState?.current
      && onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_C], keyMapping, { allowExtraKeys: 0 })
    ) {
      // Close the output
      closeOutput();
    } else if (isApplicationActive()) {
      const currentApplicationConfig = getCurrentApplicationConfiguration();
      const application = (currentApplicationConfig || {})?.application;

      // If in a context of a selected item.
      // Leave the current context and go back.
      if (onlyKeysPresent([KEY_CODE_ESCAPE], keyMapping, { allowExtraKeys: 0 }) && !refError?.current) {
        pauseEvent(event);
        stopHandling = true;
        removeApplication();
      } else if (application && !refError?.current) {
        let actionExecuted = false;

        application?.buttons?.forEach((button) => {
          const {
            keyboard_shortcuts: keyboardShortcuts,
          } = button;

          keyboardShortcuts?.forEach((keyCodes) => {
            if (onlyKeysPresent(keyCodes, keyMapping, { allowExtraKeys: 1 })) {
              pauseEvent(event);

              if (!actionExecuted) {
                actionExecuted = true;
                stopHandling = true;
              }

              return executeButtonActions({
                ...currentApplicationConfig,
                closeCommandCenter,
                button,
                fetchItems,
                getItemsActionResults,
                handleSelectItemRow,
                itemsRef: refItems,
                refError,
                removeApplication,
              });
            }
          });
        });

        if (!actionExecuted) {
          if (isCurrentApplicationDetailList(currentApplicationConfig)) {
            stopHandling = false;
          }
        }
      }
    }

    if (InputElementEnum.MAIN === refFocusedElement?.current && !stopHandling) {
      // If the main input is active.
      const focusedItemIndex = refFocusedItemIndex?.current;

      if (onlyKeysPresent([KEY_CODE_ESCAPE], keyMapping, { allowExtraKeys: 0 }) && !refError?.current) {
        pauseEvent(event);

        // If there is text in the input, clear it.
        if (refInput?.current?.value?.length >= 1) {
          refInput.current.value = '';

          if (refFocusedSearchHistoryIndex?.current !== null
            || refSelectedSearchHistoryIndex?.current !== null
          ) {
            refFocusedSearchHistoryIndex.current = null;
            refSelectedSearchHistoryIndex.current = null
          }

          // Reset the items to the original list of items.
          return renderItems(refItemsInit?.current || []);
        } else {
          // If there is no text in the input, close.
          return closeCommandCenter();
        }
      } else if (onlyKeysPresent([KEY_CODE_ENTER], keyMapping, { allowExtraKeys: 0 })
        && focusedItemIndex !== null
        && !refError?.current
      ) {
        pauseEvent(event);
        // Pressing enter on an item
        return handleSelectItemRow(refItems?.current?.[focusedItemIndex], focusedItemIndex);
      } else if (
        onlyKeysPresent([KEY_CODE_BACKSPACE], keyMapping, { allowExtraKeys: 0 })
          || onlyKeysPresent([KEY_CODE_DELETE], keyMapping, { allowExtraKeys: 0 })
      ) {
        if (refSelectedSearchHistoryIndex?.current !== null) {
          refSelectedSearchHistoryIndex.current = null;
        }

        if (refFocusedSearchHistoryIndex?.current !== null) {
          refFocusedSearchHistoryIndex.current = null;
        }
      } else {
        let index = null;
        // Arrow down
        if (onlyKeysPresent([KEY_CODE_ARROW_DOWN], keyMapping, { allowExtraKeys: 0 })) {
          pauseEvent(event);

          if (refFocusedSearchHistoryIndex?.current !== null) {
            refSelectedSearchHistoryIndex.current = refFocusedSearchHistoryIndex.current;
            refFocusedSearchHistoryIndex.current = null;
          }

          // If already on the last item, don’t change
          if (focusedItemIndex <= refItems?.current?.length - 2) {
            index = focusedItemIndex + 1;
          } else {
            index = focusedItemIndex;
          }
          // Arrow up
        } else if (onlyKeysPresent([KEY_CODE_ARROW_UP], keyMapping, { allowExtraKeys: 0 })) {
          pauseEvent(event);
          // If already on the first item, don’t change.
          // Next time they go up, show recently searched items.

          const firstKeyDown = refKeyDownCode?.current === null;
          refKeyDownCode.current = keyHistory?.[0];

          if (focusedItemIndex >= 1) {
            index = focusedItemIndex - 1;
          } else if ((firstKeyDown || refFocusedSearchHistoryIndex?.current !== null)
            && refSelectedSearchHistoryIndex?.current === null
          ) {
            const arr = getSearchHistory() || [];
            let index2 = refFocusedSearchHistoryIndex?.current === null
              ? -1
              : refFocusedSearchHistoryIndex?.current;

            if (index2 < (arr?.length || 0) - 1) {
              index2 += 1;
              refFocusedSearchHistoryIndex.current = index2;

              const searchItem = arr?.[index2];
              if (searchItem) {
                if (refInput?.current) {
                  refInput.current.value = searchItem?.searchText;
                }

                if (searchItem?.items) {
                  renderItems(searchItem?.items || []);
                }
              }
            }
          }
        }

        if (index !== null) {
          return handleNavigation(index);
        }
      }
    }
  }, [
    fetchItems,
    reload,
  ]);

  useEffect(() => {
    if (refReload?.current === null) {
      setReload(prev => prev === null ? 0 : prev + 1);
    }

    if (typeof window !== 'undefined') {
      const eventCustom = new CustomEvent(CUSTOM_EVENT_NAME_COMMAND_CENTER_STATE_CHANGED, {
        detail: {
          state: CommandCenterStateEnum.MOUNTED,
        },
      });
      window.dispatchEvent(eventCustom);
    }
  }, []);

  useEffect(() => {
    if (reload !== null) {
      renderItems(getCachedItems(), { shouldFilter: true });
      fetchItems({
        delay: 5000,
      });
      refReload.current = (refReload?.current || 0) + 1;
    }
  }, [reload]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!refActive?.current) {
        return;
      }

      let isOutside = true;
      // @ts-ignore
      if (refContainer?.current) {
        if (refContainer?.current?.contains?.(e.target)) {
          isOutside = false;
        } else {
          const {
            clientX,
            clientY,
          } = e;
          const {
            height,
            width,
            x,
            y,
          } = refContainer?.current?.getBoundingClientRect() || {};

          isOutside = clientX > (x + width)
            || clientX < x
            || clientY > (y + height)
            || clientY < y;
        }
      }

      if (isOutside) {
        closeCommandCenter();
      } else {
        if (refFocusedItemIndex?.current === null && refItems?.current?.length >= 1) {
          handleNavigation(0);
        }
        refInput?.current?.focus();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    }
  }, []);

  useEffect(() => {
    const handleOpen = () => {
      if (!refActive?.current) {
        openCommandCenter();
      }
    };

    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.addEventListener(CUSTOM_EVENT_NAME_COMMAND_CENTER_OPEN, handleOpen);
    }

    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.removeEventListener(CUSTOM_EVENT_NAME_COMMAND_CENTER_OPEN, handleOpen);
      }
    };
  }, []);

  return (
    <>
      <ContainerStyle
        className={[
          refActive?.current ? '' : 'hide',
          getCurrentMode()?.type || '',
        ]?.join(' ')}
        ref={refContainer}
      >
        <InputContainerStyle id={INPUT_CONTAINER_ID}>
          <HeaderContainerStyle>
            <HeaderStyle
              className="inactive"
              id={HEADER_ID}
              ref={refHeader}
            >
              <Button
                borderLess
                iconOnly
                noBackground
                onClick={() => removeApplication()}
                outline
              >
                <ArrowLeft size={2 * UNIT} />
              </Button>

              <Spacing mr={1} />

              <KeyboardTextGroup
                addPlusSignBetweenKeys
                keyTextGroups={[[KEY_SYMBOL_ESCAPE]]}
                monospace
              />

              <Spacing mr={1} />

              <HeaderTitleStyle id={HEADER_TITLE_ID} ref={refHeaderTitle} />
            </HeaderStyle>

            <InputStyle
              autoComplete="off"
              className="inactive"
              id={MAIN_TEXT_INPUT_ID}
              onChange={(e) => {
                // There is no need to set refInput.current.value = searchText,
                // this is already done when typing in the input element.
                const searchText = e.target.value;
                const isRemoving = searchText?.length < refInputValuePrevious?.current?.length;

                refInputValuePrevious.current = searchText;

                renderItems(isCurrentApplicationDetailList()
                  ? refItemsApplicationDetailList?.current || []
                  : combineUnique([
                      refItemsInit?.current || [],
                      refItems?.current || [],
                      getCachedItems() || [],
                    ]),
                  {
                    shouldFilter: true,
                  },
                );

                fetchItems({ delay: 300 });

                if (isRemoving) {
                  refSelectedSearchHistoryIndex.current = null;
                  refFocusedSearchHistoryIndex.current = null;
                } else if (refFocusedSearchHistoryIndex?.current !== null) {
                  refSelectedSearchHistoryIndex.current = refFocusedSearchHistoryIndex.current;
                  refFocusedSearchHistoryIndex.current = null;
                }
              }}
              onFocus={() => {
                refFocusedElement.current = InputElementEnum.MAIN;
              }}
              onBlur={() => {
                refFocusedElement.current = null;
              }}
              placeholder={getInputPlaceholder(getCurrentApplicationConfiguration())}
              ref={refInput}
            />

            <KeyboardShortcutStyle
              className="inactive"
              ref={refInputKeyboardShortcut}
            >
              <LaunchKeyboardShortcutText settings={refSettings?.current} />
            </KeyboardShortcutStyle>
          </HeaderContainerStyle>
        </InputContainerStyle>

        <ItemsContainerStyle
          className="inactive"
          id={ITEMS_CONTAINER_UUID}
          ref={refItemsNodesContainer}
        >
        </ItemsContainerStyle>

        <ApplicationContainerStyle
          className="inactive"
          id={ITEM_CONTEXT_CONTAINER_ID}
          ref={refApplicationsNodesContainer}
        />

        <OutputContainerStyle
          className="inactive"
          id={OUTPUT_CONTAINER_ID}
          ref={refOutputContainer}
        />

        <FooterWraperStyle>
          <LoadingStyle
            className="inactive"
            ref={refLoading}
          >
            <Loading width="100%" />
          </LoadingStyle>

          <FooterStyle
            className="inactive output-inactive"
            id={FOOTER_ID}
            ref={refFooter}
          >
            <Footer
              addApplication={(item, application) => addApplication({
                application,
                executeAction,
                focusedItemIndex: refFocusedItemIndex?.current,
                invokeRequest,
                item,
                itemsRef: refItems,
              })}
              closeCommandCenter={closeCommandCenter}
              closeOutput={closeOutput}
              handleNavigation={(increment: number) => {
                if (increment >= 1) {
                  handleNavigation(Math.min(
                    refItems?.current?.length - 1,
                    refFocusedItemIndex?.current + increment,
                  ));
                } else if (increment <= -1) {
                  handleNavigation(Math.max(
                    0,
                    refFocusedItemIndex?.current + increment,
                  ));
                }
              }}
              handleSelectItemRow={() => handleSelectItemRow(
                refItems?.current?.[refFocusedItemIndex?.current],
                refFocusedItemIndex?.current,
              )}
              refFooterButtonEnter={refFooterButtonEnter}
              refFooterButtonEscape={refFooterButtonEscape}
              refFooterButtonUp={refFooterButtonUp}
            />
          </FooterStyle>

          <ApplicationFooterStyle
            className="inactive output-inactive"
            id={APPLICATION_FOOTER_ID}
            ref={refApplicationsFooter}
          />
        </FooterWraperStyle>
      </ContainerStyle>

      {renderApplications()}
    </>
  );
}

export default CommandCenter;
