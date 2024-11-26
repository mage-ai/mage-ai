import moment from 'moment';
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';
import { toast } from 'react-toastify';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';


import AWSEMRClusterType, { ClusterStatusStateEnum } from '@interfaces/AWSEMRClusterType';
import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import ClickOutside from '@oracle/components/ClickOutside';
import ClusterSelection from './ClusterSelection';
import ClusterType, { ClusterStatusEnum } from '@interfaces/ClusterType';
import ConnectionSettings from '@components/ComputeManagement/ConnectionSettings';
import Divider from '@oracle/elements/Divider';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import KernelType from '@interfaces/KernelType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import Panel from '@oracle/components/Panel';
import PipelineType, {
  PipelineTypeEnum,
  PIPELINE_TYPE_DISPLAY_NAME,
  PIPELINE_TYPE_TO_KERNEL_NAME,
} from '@interfaces/PipelineType';
import PopupMenu from '@oracle/components/PopupMenu';
import SetupSteps from '@components/ComputeManagement/Clusters/SetupSteps';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import useComputeService from '@utils/models/computeService/useComputeService'
import useKernel from '@utils/models/kernel/useKernel';
import usePrevious from '@utils/usePrevious';
import useProject from '@utils/models/project/useProject';
import {
  AlertTriangle,
  Check,
  PowerOnOffButton,
} from '@oracle/icons';
import { CloudProviderSparkClusterEnum } from '@interfaces/CloudProviderType';
import { ComputeConnectionStateEnum } from '@interfaces/ComputeConnectionType';
import { HeaderViewOptionsStyle, PipelineHeaderStyle } from './index.style';
import {
  KEY_CODE_ENTER,
  KEY_SYMBOL_CONTROL,
  KEY_SYMBOL_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import {
  LOCAL_STORAGE_KEY_HIDE_KERNEL_WARNING,
  get,
  set,
} from '@storage/localStorage';
import { MenuStyle } from './ClusterSelection/index.style'
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SetupStepStatusEnum, SetupStepUUIDEnum } from '@interfaces/ComputeServiceType';
import { SparkApplicationType } from '@interfaces/SparkType';
import { ThemeType } from '@oracle/styles/themes/constants';
import { removeUnderscore, roundNumber } from '@utils/string';
import { find } from '@utils/array';
import { goToWithQuery } from '@utils/routing';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { selectKeys } from '@utils/hash';
import { useError } from '@context/Error';
import { useKeyboardContext } from '@context/Keyboard';
import { useModal } from '@context/Modal';

type KernelStatusProps = {
  children?: any;
  isBusy: boolean;
  pipeline: PipelineType;
  restartKernel: () => void;
  savePipelineContent: () => void;
  setErrors: (errors: ErrorsType) => void;
  setRunningBlocks: (blocks: BlockType[]) => void;
  updatePipelineMetadata: (name: string, type?: string) => void;
};

function KernelStatus({
  children,
  isBusy,
  pipeline,
  restartKernel,
  savePipelineContent,
  setErrors,
  setRunningBlocks,
  updatePipelineMetadata,
}: KernelStatusProps) {
  const router = useRouter();
  const { kernel } = useKernel({ pipelineType: pipeline?.type });
  const {
    featureEnabled,
    featureUUIDs,
    sparkEnabled,
  } = useProject();
  const {
    activeCluster,
    clusters,
    clustersLoading,
    computeService,
    computeServiceUUIDs,
    connections,
    connectionsLoading,
    fetchAll,
    fetchComputeClusters,
    setupComplete,
  } = useComputeService({
    clustersRefreshInterval: 5000,
    computeServiceRefreshInterval: 5000,
    connectionsRefreshInterval: 5000,
    pauseFetch: !sparkEnabled,
  });

  const themeContext: ThemeType = useContext(ThemeContext);
  const {
    alive,
    usage,
  } = kernel || {};
  const [selectedSparkClusterType, setSelectedSparkClusterType] =
    useState(CloudProviderSparkClusterEnum.EMR);
  const [showSelectCluster, setShowSelectCluster] = useState(false);
  const [showSelectKernel, setShowSelectKernel] = useState(false);
  const [clusterSelectionVisible, setClusterSelectionVisible] = useState(false);
  const [computeConnectionVisible, setComputeConnectionVisible] = useState(false);

  const refSelectKernel = useRef(null);

  // TODO (tommy dang): how do we make this dynamic based on the cloud provider they choose?
  const {
    data: dataClusters,
    mutate: fetchClusters,
  } = api.clusters.detail(sparkEnabled ? selectedSparkClusterType : null, {}, { revalidateOnFocus: false });
  const clustersOld: ClusterType[] = useMemo(
    () => dataClusters?.cluster?.clusters || [],
    [dataClusters],
  );
  const selectedCluster = useMemo(
    () => find(clustersOld, ({ is_active: isActive }) => isActive),
    [clustersOld],
  );

  const [updateClusterOld] = useMutation(
    api.clusters.useUpdate(selectedSparkClusterType),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchClusters();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const {
    data: dataSparkApplications,
  } = api.spark_applications.list({}, {}, {
    pauseFetch: !sparkEnabled,
  });
  const sparkApplications: SparkApplicationType[] =
    useMemo(() => dataSparkApplications?.spark_applications, [
      dataSparkApplications,
    ]);

  const uuidKeyboard = 'KernelStatus';
  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  const kernelPid = useMemo(() => usage?.pid, [usage?.pid]);
  const kernelPidPrevious = usePrevious(kernelPid);



  const [showKernelWarning, hideKernelWarning] = useModal(() => (
    <PopupMenu
      cancelText="Close"
      centerOnScreen
      confirmText="Don't show again"
      neutral
      onCancel={hideKernelWarning}
      onClick={() => {
        set(LOCAL_STORAGE_KEY_HIDE_KERNEL_WARNING, 1);
        hideKernelWarning();
      }}
      subtitle={
        'You may need to refresh your page to continue using the notebook. Unexpected ' +
        'kernel restarts may be caused by your kernel running out of memory.'
      }
      title="The kernel has restarted"
      width={UNIT * 34}
    />
  ), {}, [], {
    background: true,
    uuid: 'restart_kernel_warning',
  });

  useEffect(() => {
    const hide = get(LOCAL_STORAGE_KEY_HIDE_KERNEL_WARNING, 0);
    if (kernelPid !== kernelPidPrevious && isBusy && !hide) {
      showKernelWarning();
      setRunningBlocks([]);
    }
  }, [
    isBusy,
    kernelPid,
    kernelPidPrevious,
    setRunningBlocks,
    showKernelWarning,
  ]);

  const validComputePipelineType = useMemo(() => [
    PipelineTypeEnum.PYTHON,
    PipelineTypeEnum.PYSPARK,
  ].includes(pipeline?.type), [
    pipeline,
  ]);

  const statusIconMemo = useMemo(() => {
    return (
      <Circle
        color={isBusy
          ? (themeContext || dark).borders.info
          : (alive
            ? (themeContext || dark).borders.success
            : (themeContext || dark).borders.danger
          )
        }
        size={UNIT}
      />
    );
  }, [
    alive,
    isBusy,
    themeContext,
  ]);

  const [updateCluster, { isLoading: isLoadingUpdateCluster }] = useMutation(
    (cluster: AWSEMRClusterType) => api.compute_clusters.compute_services.useUpdate(
      computeService?.uuid,
      cluster?.id,
    )({
      compute_cluster: selectKeys(cluster, [
        'active',
      ]),
    }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchComputeClusters();
          },
          onErrorCallback: ({
            error: {
              errors,
              exception,
              message,
              type,
            },
          }) => {
            toast.error(
              errors?.error || exception || message,
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: type,
              },
            );
          },
        },
      ),
    },
  );

  const computeConnectionStatusMemo = useMemo(() => {
    if (!sparkEnabled
      || !validComputePipelineType
      || computeServiceUUIDs.AWS_EMR !== computeService?.uuid
      || PipelineTypeEnum.PYSPARK !== pipeline?.type
    ) {
      return null;
    }

    const connection = connections?.find(({ uuid }) => SetupStepUUIDEnum.OBSERVABILITY === uuid);
    if (!connection) {
      return null;
    }

    const {
      name,
      state,
      status_calculated: status,
      uuid,
    } = connection;

    const active = [
      ComputeConnectionStateEnum.ACTIVE,
    ].includes(state);
    const inactive = [
      ComputeConnectionStateEnum.INACTIVE,
    ].includes(state);
    const completed = [
      SetupStepStatusEnum.COMPLETED,
    ].includes(status);

    const buttonProps: {
      muted?: boolean;
      warning?: boolean;
    } = {
      muted: true,
      warning: false,
    };

    let displayText = name || uuid;
    if (completed) {
      if (active) {
        displayText = 'Observability enabled';
         buttonProps.muted = false;
      } else {
        displayText = 'SSH tunnel not connected';
      }
    }

    const menuEl = (
      <ClickOutside
        onClickOutside={(e) => {
          pauseEvent(e);
          setComputeConnectionVisible(false);
        }}
        open={computeConnectionVisible}
      >
        <MenuStyle>
          <ConnectionSettings
            actionsOnly={completed}
            computeService={computeService}
            computeConnections={[connection]}
            contained={false}
            hideDetails
            fetchAll={fetchAll}
            onClickStep={(tab: string) => {
              router.push(`/compute?tab=${tab}`);
            }}
            small
          />
        </MenuStyle>
      </ClickOutside>
    );

    const statusIconEl = (
      <PowerOnOffButton
        danger={[
          SetupStepStatusEnum.ERROR,
        ].includes(status)}
        muted={[
          SetupStepStatusEnum.INCOMPLETE,
        ].includes(status)}
        success={completed && active}
      />
    );

    return (
      <div style={{ position: 'relative' }}>
        <KeyboardShortcutButton
          beforeElement={statusIconEl}
          blackBorder
          compact
          inline
          noHover={connectionsLoading}
          onClick={(e) => {
            pauseEvent(e);
            if (!computeConnectionVisible) {
              setComputeConnectionVisible(true);
            }
            setClusterSelectionVisible(false);
          }}
          uuid="Pipeline/ComputeConnectionStatus"
          {...buttonProps}
        >
          {displayText}
        </KeyboardShortcutButton>

        {menuEl}
      </div>
    );
  }, [
    computeConnectionVisible,
    computeService,
    connections,
    connectionsLoading,
    fetchAll,
    pipeline,
    setClusterSelectionVisible,
    setComputeConnectionVisible,
    validComputePipelineType,
  ]);

  const computeStatusMemo = useMemo(() => {
    if (!sparkEnabled || !validComputePipelineType) {
      return null;
    }

    let menuEl;
    let onClick;
    let pipelineDisplayName;
    let statusIconEl;
    const buttonProps: {
      muted?: boolean;
      warning?: boolean;
    } = {
      muted: false,
      warning: false,
    };

    if (computeServiceUUIDs.AWS_EMR === computeService?.uuid) {
      const step =
        computeService?.setup_steps?.find(({ uuid }) => SetupStepUUIDEnum.SETUP === uuid);

      const setupCompleteModified = step?.status_calculated;

      if (PipelineTypeEnum.PYSPARK !== pipeline?.type) {
        return null;
      }

      if (activeCluster) {
        const state = activeCluster?.status?.state;

        pipelineDisplayName = (
          <Text monospace>
            {activeCluster?.id} {state && ![
              ClusterStatusStateEnum.RUNNING,
              ClusterStatusStateEnum.WAITING,
            ].includes(state) && removeUnderscore(state)}
          </Text>
        );
        statusIconEl = (
          <PowerOnOffButton
            danger={[
              ClusterStatusStateEnum.TERMINATED_WITH_ERRORS,
            ].includes(state)}
            default={[
                ClusterStatusStateEnum.STARTING,
              ].includes(state)}
            muted={[
              ClusterStatusStateEnum.TERMINATED,
            ].includes(state)}
            success={[
              ClusterStatusStateEnum.RUNNING,
              ClusterStatusStateEnum.WAITING,
            ].includes(state)}
            warning={[
              ClusterStatusStateEnum.TERMINATING,
            ].includes(state)}
          />
        );
      } else if (setupCompleteModified) {
        if (!clusters?.length) {
          pipelineDisplayName = 'Launch a new cluster';
        } else {
          pipelineDisplayName = 'Select a compute cluster';
        }

        statusIconEl = (
          <PowerOnOffButton warning />
        );
      } else {
        // Show the incomplete steps
        menuEl = (
          <ClickOutside
            onClickOutside={(e) => {
              pauseEvent(e);
              setClusterSelectionVisible(false);
            }}
            open={clusterSelectionVisible}
          >
            <MenuStyle>
              <SetupSteps
                contained={false}
                onClickStep={(tab: string) => {
                  router.push(`/compute?tab=${tab}`);
                }}
                setupSteps={computeService?.setup_steps}
                small
              />
            </MenuStyle>
          </ClickOutside>
        );
        onClick = (e) => {
          pauseEvent(e);
          if (!clusterSelectionVisible) {
            setClusterSelectionVisible(true);
          }
          setComputeConnectionVisible(false);
        };
        pipelineDisplayName = 'Compute setup incomplete';
        statusIconEl = (
          <AlertTriangle
            danger
          />
        );
      }

      if (activeCluster || setupCompleteModified) {
        menuEl = (
          <ClickOutside
            onClickOutside={(e) => {
              pauseEvent(e);
              setClusterSelectionVisible(false);
            }}
            open={clusterSelectionVisible}
          >
            <ClusterSelection />
          </ClickOutside>
        );
        onClick = (e) => {
          pauseEvent(e);
          if (!clusterSelectionVisible) {
            setClusterSelectionVisible(true);
          }
          setComputeConnectionVisible(false);
          setComputeConnectionVisible(false);
        };
      }
    } else if (computeServiceUUIDs.STANDALONE_CLUSTER === computeService?.uuid) {
      if (!dataSparkApplications) {
        pipelineDisplayName = 'Loading compute';
        statusIconEl = (
          <Spinner
            inverted
            small
          />
        );
      } else if (!sparkApplications?.length) {
        onClick = () => router.push('/compute');
        pipelineDisplayName = 'Compute unavailable';
        statusIconEl = (
          <PowerOnOffButton
            danger
          />
        );
      } else if (sparkApplications?.length >= 1) {
        const sparkApplication = sparkApplications?.[0];

        pipelineDisplayName = [
          sparkApplication?.name,
          sparkApplication?.attempts?.[0]?.app_spark_version,
        ].filter(value => value).join(' ');

        statusIconEl = (
          <PowerOnOffButton
            success
          />
        );
      }
    }

    return (pipelineDisplayName
      ? (
        <div style={{ position: 'relative' }}>
          <KeyboardShortcutButton
            beforeElement={statusIconEl}
            blackBorder
            compact
            inline
            noHover={!dataSparkApplications || sparkApplications?.length >= 1}
            onClick={onClick}
            uuid="Pipeline/ComputeStatus"
            {...buttonProps}
          >
            {pipelineDisplayName}
          </KeyboardShortcutButton>

          {menuEl}
        </div>
      ): null
    );
  }, [
    activeCluster,
    clusterSelectionVisible,
    clusters,
    computeService,
    computeServiceUUIDs,
    dataSparkApplications,
    pipeline,
    router,
    setClusterSelectionVisible,
    setComputeConnectionVisible,
    sparkApplications,
    sparkEnabled,
    validComputePipelineType,
  ]);

  const kernelStatusMemo = useMemo(() => (
    <div
      ref={refSelectKernel}
      style={{
        position: 'relative',
      }}
    >
      <FlexContainer alignItems="center">
        {pipeline?.type === PipelineTypeEnum.PYSPARK && !sparkEnabled && (
          <Spacing mr={PADDING_UNITS}>
            <Link
              muted={!!selectedCluster}
              onClick={() => setShowSelectCluster(true)}
              preventDefault
              sameColorAsText={!selectedCluster}
              underline={!selectedCluster}
            >
              {selectedCluster && selectedCluster.id}
              {!selectedCluster && 'Select cluster'}
            </Link>

            <ClickOutside
              disableEscape
              onClickOutside={() => setShowSelectCluster(false)}
              open={showSelectCluster}
            >
              <FlyoutMenu
                items={[
                  {
                    isGroupingTitle: true,
                    label: () => 'Select cluster',
                    uuid: 'select_cluster',
                  },
                  ...clustersOld.map(({
                    id,
                    is_active: isActive,
                    status,
                  }) => ({
                      label: () => (
                        <FlexContainer
                          alignItems="center"
                          fullWidth
                          justifyContent="space-between"
                        >
                          <Flex flex={1}>
                            <Text
                              muted={!isActive && ClusterStatusEnum.WAITING !== status}
                            >
                              {id}
                            </Text>
                          </Flex>

                          {isActive && (
                            <Check
                              size={2 * UNIT}
                              success
                            />
                          )}

                          {!isActive && (
                            <Text monospace muted>
                              {status}
                            </Text>
                          )}
                        </FlexContainer>
                      ),
                      onClick: isActive || ClusterStatusEnum.WAITING !== status
                        ? null
                        // @ts-ignore
                        : () => updateClusterOld({
                            cluster: {
                              id,
                            },
                          }),
                      uuid: id,
                    })),
                ]}
                onClickCallback={() => setShowSelectCluster(false)}
                open={showSelectCluster}
                parentRef={refSelectKernel}
                uuid="KernelStatus/select_cluster"
                width={UNIT * 40}
              />
            </ClickOutside>
          </Spacing>
        )}

        <KeyboardShortcutButton
          beforeElement={statusIconMemo}
          blackBorder
          compact
          inline
          onClick={() => setShowSelectKernel(true)}
          uuid="Pipeline/KernelStatus/kernel"
        >
          {PIPELINE_TYPE_DISPLAY_NAME[pipeline?.type || PipelineTypeEnum.PYTHON]}
        </KeyboardShortcutButton>

        <ClickOutside
          disableEscape
          onClickOutside={() => setShowSelectKernel(false)}
          open={showSelectKernel}
        >
          <FlyoutMenu
            items={[
              {
                isGroupingTitle: true,
                label: () => 'Select kernel',
                uuid: 'select_kernel',
              },
              ...Object.keys(PIPELINE_TYPE_TO_KERNEL_NAME)
                .filter(type => pipeline?.type != type)
                .map(type => ({
                  label: () => PIPELINE_TYPE_DISPLAY_NAME[type] || type,
                  onClick: () => updatePipelineMetadata(pipeline?.name, type),
                  uuid: type,
                })),
            ]}
            onClickCallback={() => setShowSelectKernel(false)}
            open={showSelectKernel}
            parentRef={refSelectKernel}
            rightOffset={0}
            uuid="KernelStatus/select_kernel"
            width={UNIT * 25}
          />
        </ClickOutside>
      </FlexContainer>
    </div>
  ), [
    alive,
    clustersOld,
    isBusy,
    pipeline,
    selectedCluster,
    setShowSelectCluster,
    setShowSelectKernel,
    showSelectCluster,
    showSelectKernel,
    statusIconMemo,
    themeContext,
    updateCluster,
    updateClusterOld,
    updatePipelineMetadata,
  ]);


  return (
    <FlexContainer
      alignItems="center"
      fullHeight
      justifyContent="space-between"
    >
      <FlexContainer
        alignItems="center"
        fullHeight
        justifyContent="flex-start"
      >
        {children}
      </FlexContainer>

      <Spacing px={PADDING_UNITS}>
        <Flex alignItems="center">
          <FlexContainer alignItems="center">
            {kernelStatusMemo}

            {computeConnectionStatusMemo && (
              <Spacing ml={1}>
                {computeConnectionStatusMemo}
              </Spacing>
            )}

            {computeStatusMemo && (
              <Spacing ml={1}>
                {computeStatusMemo}
              </Spacing>
            )}
          </FlexContainer>
        </Flex>
      </Spacing>
    </FlexContainer>
  );
}

export default KernelStatus;
