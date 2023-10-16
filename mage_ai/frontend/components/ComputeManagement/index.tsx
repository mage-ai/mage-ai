import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import ConnectionSettings from './ConnectionSettings';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import ProjectType, { SparkConfigType } from '@interfaces/ProjectType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import {
  Monitor,
  PowerOnOffButton,
  WorkspacesUsersIcon,
} from '@oracle/icons';
import {
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
import { onSuccess } from '@api/utils/response';
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
  const [beforeWidth, setBeforeWidth] = useState(Math.max(
    get(localStorageKeyBefore),
    UNIT * 40,
  ));
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);
  const [afterHidden, setAfterHidden] = useState<boolean>(true);

  const [selectedTab, setSelectedTab] = useState<{
    main?: MainNavigationTabEnum;
  }>({
    main: MainNavigationTabEnum.CONNECTION,
  });

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
    }
  }, [
    project,
    setObjectAttributesState,
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
  const updateProject = useCallback(() => updateProjectBase({
    project: objectAttributes,
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

    return arr;
  }, [
    selectedTab,
    setSelectedTab,
  ]);

  const after = useMemo(() => {}, []);

  const connectionMemo = useMemo(() => (
    <ConnectionSettings
      attributesTouched={attributesTouched?.spark_config || {}}
      isLoading={isLoadingUpdateProject}
      mutateObject={updateProject}
      objectAttributes={objectAttributes?.spark_config}
      setObjectAttributes={setObjectAttributesSparkConfig}
    />
  ), [
    attributesTouched,
    isLoadingUpdateProject,
    objectAttributes,
    setObjectAttributesSparkConfig,
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
      {project && (
        <>
          {MainNavigationTabEnum.CONNECTION === selectedTab?.main && connectionMemo}
        </>
      )}
    </TripleLayout>
  );
}

export default ComputeManagement;
