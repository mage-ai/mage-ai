import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import ConnectionSettings from './ConnectionSettings';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import ProjectType, { SparkConfigType } from '@interfaces/ProjectType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import { CardStyle } from './index.style';
import {
  Monitor,
  PowerOnOffButton,
  WorkspacesUsersIcon,
} from '@oracle/icons';
import {
  COMPUTE_SERVICES,
  COMPUTE_SERVICE_DISPLAY_NAME,
  COMPUTE_SERVICE_KICKER,
  COMPUTE_SERVICE_RENDER_ICON_MAPPING,
  ComputeServiceEnum,
  MAIN_NAVIGATION_TAB_DISPLAY_NAME_MAPPING,
  MainNavigationTabEnum,
  ObjectAttributesType,
} from './constants';
import { NavigationStyle } from '@components/DataIntegrationModal/index.style';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { get, set } from '@storage/localStorage';
import { getComputeServiceFromProject } from './utils';
import { onSuccess } from '@api/utils/response';
import { selectKeys } from '@utils/hash';
import { useError } from '@context/Error';
import { useWindowSize } from '@utils/sizes';

type ComputeManagementProps = {
  contained?: boolean;
  heightOffset?: number;
  mainContainerRef: any;
};

function ComputeManagement({
  contained,
  heightOffset,
  mainContainerRef,
}: ComputeManagementProps) {
  const componentUUID =
    useMemo(() => `ComputeManagement/${contained ? 'contained' : 'open'}`, [contained]);
  const [showError] = useError(null, {}, [], {
    uuid: componentUUID,
  });

  const refAfterHeader = useRef(null);
  const refAfterFooter = useRef(null);
  const refSubheader = useRef(null);

  const {
    height: heightWindow,
    width: widthWindow,
  } = useWindowSize();

  const containerHeight = useMemo(() => heightWindow - (heightOffset || 0), [
    heightOffset,
    heightWindow,
  ]);

  const localStorageKeyAfter =
    useMemo(() => `block_layout_after_width_${componentUUID}`, [componentUUID]);
  const localStorageKeyBefore =
    useMemo(() => `block_layout_before_width_${componentUUID}`, [componentUUID]);

  const [afterWidth, setAfterWidth] = useState(get(localStorageKeyAfter, UNIT * 60));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeWidth, setBeforeWidthState] = useState(Math.max(
    get(localStorageKeyBefore),
    UNIT * 20,
  ));
  const setBeforeWidth = useCallback((width: number) => {
    setBeforeWidthState(width || UNIT * 20);
    set(localStorageKeyBefore, width || UNIT * 20);
  }, [
    localStorageKeyBefore,
    setBeforeWidthState,
  ]);

  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);
  const [afterHidden, setAfterHidden] = useState<boolean>(true);

  const [selectedTab, setSelectedTab] = useState<{
    main?: MainNavigationTabEnum;
  }>({
    main: MainNavigationTabEnum.CONNECTION,
  });

  const [selectedComputeService, setSelectedComputeService] = useState<ComputeServiceEnum>(null);

  const [objectAttributes, setObjectAttributesState] = useState<ObjectAttributesType>(null);
  const [attributesTouched, setAttributesTouched] = useState<ObjectAttributesType>({});
  const setObjectAttributes = useCallback((data) => {
    setAttributesTouched(prev => ({
      ...prev,
      ...data,
    }));
    setObjectAttributesState(prev => ({
      ...prev,
      ...data,
    }));
  }, [
    setAttributesTouched,
    setObjectAttributesState,
  ]);
  const setObjectAttributesSparkConfig =
    useCallback((data: SparkConfigType) => setObjectAttributes({
      spark_config: {
        ...objectAttributes?.spark_config,
        ...data,
      },
    }), [
      objectAttributes,
      setObjectAttributes,
    ]);

  const { data } = api.projects.list({}, {
    revalidateOnFocus: false,
  });
  const project: ProjectType = useMemo(() => data?.projects?.[0], [data]);
  const projectName = useMemo(() => project?.name, [project]);

  useEffect(() => {
    if (project) {
      setObjectAttributesState(project);
      setSelectedComputeService(getComputeServiceFromProject(project));
    }
  }, [
    project,
    setObjectAttributesState,
    setSelectedComputeService,
  ]);

  const [updateProjectBase, { isLoading: isLoadingUpdateProject }]: any = useMutation(
    api.projects.useUpdate(projectName),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            project: objectServer,
          }) => {
            setObjectAttributesState(objectServer);
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );
  const updateProject = useCallback((data?: ObjectAttributesType) => updateProjectBase({
    project: selectKeys({
      ...objectAttributes,
      ...data,
    }, [
      'emr_config',
      'remote_variables_dir',
      'spark_config',
    ]),
  }), [
    objectAttributes,
    updateProjectBase,
  ]);

  const before = useMemo(() => {
    const arr = [
      {
        Icon: PowerOnOffButton,
        uuid: MainNavigationTabEnum.CONNECTION,
      },
      {
        Icon: WorkspacesUsersIcon,
        uuid: MainNavigationTabEnum.RESOURCES,
      },
      {
        Icon: Monitor,
        uuid: MainNavigationTabEnum.MONITORING,
      },
    ].map(({
      Icon,
      uuid,
    }: {
      Icon: any;
      uuid: MainNavigationTabEnum;
    }) => (
      <NavigationStyle
        key={uuid}
        selected={selectedTab?.main === uuid}
      >
        <Link
          block
          noHoverUnderline
          noOutline
          onClick={() => setSelectedTab(() => ({
            main: uuid,
          }))}
          preventDefault
        >
          <Spacing p={PADDING_UNITS}>
            <FlexContainer alignItems="center">
              <Icon size={UNIT * 2} />

              <Spacing mr={2} />

              <Text bold large>
                {MAIN_NAVIGATION_TAB_DISPLAY_NAME_MAPPING[uuid]}
              </Text>
            </FlexContainer>
          </Spacing>
        </Link>
      </NavigationStyle>
    ));

    if (selectedComputeService) {
      const displayName = COMPUTE_SERVICE_DISPLAY_NAME[selectedComputeService];
      const kicker = COMPUTE_SERVICE_KICKER[selectedComputeService];
      const renderIcon = COMPUTE_SERVICE_RENDER_ICON_MAPPING[selectedComputeService];

      if (displayName && kicker && renderIcon) {
        arr.unshift(
          <Spacing p={PADDING_UNITS}>
            <CardStyle inline>
              <FlexContainer alignItems="flex-start">
                <Flex flex={1}>
                  {renderIcon()}
                </Flex>

                <Button
                  compact
                  onClick={() => setSelectedComputeService(null)}
                  secondary
                  small
                >
                  Change
                </Button>
              </FlexContainer>

              <Spacing mt={PADDING_UNITS}>
                <Text default monospace>
                  {kicker}
                </Text>
                <Headline level={5}>
                  {displayName}
                </Headline>
              </Spacing>
            </CardStyle>
          </Spacing>
        );
      }
    }

    return arr;
  }, [
    selectedComputeService,
    selectedTab,
    setSelectedTab,
  ]);

  const after = useMemo(() => {}, []);

  const connectionMemo = useMemo(() => (
    <ConnectionSettings
      attributesTouched={attributesTouched || {}}
      isLoading={isLoadingUpdateProject}
      mutateObject={updateProject}
      objectAttributes={objectAttributes}
      selectedComputeService={selectedComputeService}
      setObjectAttributes={setObjectAttributes}
    />
  ), [
    attributesTouched,
    isLoadingUpdateProject,
    objectAttributes,
    selectedComputeService,
    setObjectAttributes,
    updateProject,
  ]);

  const computeServicesMemo = useMemo(() => (
    <Spacing mx={1} py={PADDING_UNITS}>
      <Spacing mb={PADDING_UNITS} px={PADDING_UNITS}>
        <Headline>
          Select a compute service
        </Headline>
      </Spacing>

      <FlexContainer alignItems="center" flexWrap="wrap">
        {COMPUTE_SERVICES.map(({
          buildPayload,
          displayName,
          documentationHref,
          kicker,
          renderIcon,
          uuid,
        }) => (
          <CardStyle key={uuid}>
            {renderIcon()}

            <Spacing mt={PADDING_UNITS}>
              <Text default monospace>
                {kicker}
              </Text>
              <Headline level={4}>
                {displayName}
              </Headline>
            </Spacing>

            <Spacing mt={PADDING_UNITS}>
              <FlexContainer alignItems="center">
                <Button
                  loading={isLoadingUpdateProject && uuid === selectedComputeService}
                  onClick={() => {
                    setSelectedComputeService(uuid);
                    updateProject(buildPayload(objectAttributes));
                  }}
                  primary
                >
                  Enable
                </Button>

                <Spacing mr={PADDING_UNITS} />

                <Link
                  href={documentationHref}
                  default
                  openNewWindow
                >
                  View setup documentation
                </Link>
              </FlexContainer>
            </Spacing>
          </CardStyle>
        ))}
      </FlexContainer>
    </Spacing>
  ), [
    isLoadingUpdateProject,
    objectAttributes,
    selectedComputeService,
    setSelectedComputeService,
    updateProject,
  ]);

  return (
    <TripleLayout
      // after={after}
      // contained
      afterHidden={afterHidden}
      // afterInnerHeightMinus={
      //   // After header is always 48
      //   48 + (afterFooter ? (afterFooterBottomOffset || 0) : 0)
      // }
      afterMousedownActive={afterMousedownActive}
      afterWidth={afterWidth}
      before={before}
      beforeHeightOffset={0}
      beforeMousedownActive={beforeMousedownActive}
      beforeWidth={beforeWidth}
      contained
      // headerOffset={headerOffset}
      height={containerHeight}
      hideAfterCompletely
      inline
      // mainContainerHeader={subheaderEl}
      mainContainerRef={mainContainerRef}
      setAfterHidden={setAfterHidden}
      setAfterMousedownActive={setAfterMousedownActive}
      setAfterWidth={setAfterWidth}
      setBeforeMousedownActive={setBeforeMousedownActive}
      setBeforeWidth={setBeforeWidth}
      uuid={componentUUID}
    >
      {!selectedComputeService && objectAttributes && computeServicesMemo}
      {selectedComputeService && project && (
        <>
          {MainNavigationTabEnum.CONNECTION === selectedTab?.main && connectionMemo}
        </>
      )}
    </TripleLayout>
  );
}

export default ComputeManagement;
