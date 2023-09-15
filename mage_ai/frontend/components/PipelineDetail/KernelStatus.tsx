import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';
import { useMutation } from 'react-query';

import BlockType from '@interfaces/BlockType';
import Circle from '@oracle/elements/Circle';
import ClickOutside from '@oracle/components/ClickOutside';
import ClusterType, { ClusterStatusEnum } from '@interfaces/ClusterType';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import KernelType from '@interfaces/KernelType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import KeyboardText from '@oracle/elements/KeyboardText';
import Link from '@oracle/elements/Link';
import PipelineType, { PipelineTypeEnum, PIPELINE_TYPE_TO_KERNEL_NAME } from '@interfaces/PipelineType';
import PopupMenu from '@oracle/components/PopupMenu';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import usePrevious from '@utils/usePrevious';
import { Check } from '@oracle/icons';
import { CloudProviderSparkClusterEnum } from '@interfaces/CloudProviderType';
import {
  KEY_CODE_ENTER,
  KEY_CODE_META,
  KEY_SYMBOL_CONTROL,
  KEY_SYMBOL_META,
  KEY_SYMBOL_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import {
  LOCAL_STORAGE_KEY_HIDE_KERNEL_WARNING,
  get,
  set,
} from '@storage/localStorage';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PipelineHeaderStyle } from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import {
  dateFormatLongFromUnixTimestamp,
  datetimeInLocalTimezone,
} from '@utils/date';
import { find } from '@utils/array';
import { goToWithQuery } from '@utils/routing';
import { isMac } from '@utils/os';
import { onSuccess } from '@api/utils/response';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { useKeyboardContext } from '@context/Keyboard';
import { useModal } from '@context/Modal';

type KernelStatusProps = {
  children?: any;
  filePaths: string[];
  filesTouched: {
    [path: string]: boolean;
  };
  isBusy: boolean;
  isPipelineUpdating: boolean;
  kernel: KernelType;
  pipeline: PipelineType;
  pipelineContentTouched: boolean;
  pipelineLastSaved: Date;
  restartKernel: () => void;
  savePipelineContent: () => void;
  selectedFilePath?: string;
  setErrors: (errors: ErrorsType) => void;
  setRunningBlocks: (blocks: BlockType[]) => void;
  updatePipelineMetadata: (name: string, type?: string) => void;
};

function KernelStatus({
  children,
  filePaths: filePathsProp,
  filesTouched,
  isBusy,
  isPipelineUpdating,
  kernel,
  pipeline,
  pipelineContentTouched,
  pipelineLastSaved,
  restartKernel,
  savePipelineContent,
  selectedFilePath,
  setErrors,
  setRunningBlocks,
  updatePipelineMetadata,
}: KernelStatusProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const {
    alive,
    usage,
  } = kernel || {};
  const [isEditingPipeline, setIsEditingPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [selectedSparkClusterType, setSelectedSparkClusterType] =
    useState(CloudProviderSparkClusterEnum.EMR);
  const [showSelectCluster, setShowSelectCluster] = useState(false);
  const [showSelectKernel, setShowSelectKernel] = useState(false);

  const refSelectKernel = useRef(null);

  // TODO (tommy dang): how do we make this dynamic based on the cloud provider they choose?
  const {
    data: dataClusters,
    mutate: fetchClusters,
  } = api.clusters.detail(selectedSparkClusterType, {}, { revalidateOnFocus: false });
  const clusters: ClusterType[] = useMemo(
    () => dataClusters?.cluster?.clusters || [],
    [dataClusters],
  );
  const selectedCluster = useMemo(
    () => find(clusters, ({ is_active: isActive }) => isActive),
    [clusters],
  );

  const [updateCluster] = useMutation(
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

  useEffect(() => {
    if (pipeline?.uuid) {
      setNewPipelineName(pipeline.uuid);
    }
  }, [pipeline?.uuid]);

  let saveStatus;
  if (pipelineContentTouched) {
    saveStatus = 'Unsaved changes';
  } else if (isPipelineUpdating) {
    saveStatus = 'Saving changes...';
  } else if (pipelineLastSaved) {
    let lastSavedDate = dateFormatLongFromUnixTimestamp(Number(pipelineLastSaved) / 1000);
    if (pipeline?.updated_at) {
      lastSavedDate = datetimeInLocalTimezone(pipeline?.updated_at, displayLocalTimezone);
    }
    saveStatus = `Last saved ${lastSavedDate}`;
  } else {
    saveStatus = 'All changes saved';
  }

  const uuidKeyboard = 'KernelStatus';
  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping, keyHistory) => {
      if (isEditingPipeline
        && String(keyHistory[0]) === String(KEY_CODE_ENTER)
        && String(keyHistory[1]) !== String(KEY_CODE_META)
      ) {
        if (pipeline?.uuid === newPipelineName) {
          event.target.blur();
        } else {
          updatePipelineMetadata(newPipelineName);
          setIsEditingPipeline(false);
        }
      }
    },
    [
      isEditingPipeline,
      newPipelineName,
      setIsEditingPipeline,
      updatePipelineMetadata,
    ],
  );

  const kernelPid = useMemo(() => usage?.pid, [usage?.pid]);
  const kernelPidPrevious = usePrevious(kernelPid);

  const kernelMemory = useMemo(() => {
    if (usage?.kernel_memory) {
      const memory = usage.kernel_memory;
      const k = 1024;
      const dm = 2;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

      const i = Math.floor(Math.log(memory) / Math.log(k));

      return `${parseFloat((memory / Math.pow(k, i)).toFixed(dm))}${sizes[i]}`;
    }
  }, [usage?.kernel_memory]);

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

  const kernelStatus = useMemo(() => (
    <div
      ref={refSelectKernel}
      style={{
        position: 'relative',
      }}
    >
      <FlexContainer alignItems="center">
        {pipeline?.type === PipelineTypeEnum.PYSPARK && (
          <Spacing mr={1}>
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
                  ...clusters.map(({
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
                        : () => updateCluster({
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
          beforeElement={
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
          }
          blackBorder
          compact
          inline
          onClick={() => setShowSelectKernel(true)}
          uuid="Pipeline/KernelStatus/kernel"
        >
          {pipeline?.type || PipelineTypeEnum.PYTHON}
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
                  label: () => type,
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
    clusters,
    isBusy,
    pipeline,
    selectedCluster,
    setShowSelectCluster,
    setShowSelectKernel,
    showSelectCluster,
    showSelectKernel,
    themeContext,
    updateCluster,
    updatePipelineMetadata,
  ]);

  return (
    <PipelineHeaderStyle relativePosition>
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
          <Spacing px={PADDING_UNITS}>
            {selectedFilePath && (
              <Link
                noHoverUnderline
                noOutline
                onClick={selectedFilePath
                  ? () => goToWithQuery({ file_path: null })
                  : null
                }
                preventDefault
              >
                {children}
              </Link>
            )}

            {!selectedFilePath && (
              <FlexContainer alignItems="center">
                {children}
                {isEditingPipeline && (
                  <>
                    <Spacing ml={1} />
                    <Link
                      onClick={() => {
                        updatePipelineMetadata(newPipelineName);
                        setIsEditingPipeline(false);
                      }}
                      preventDefault
                      sameColorAsText
                      small
                    >
                      Update name
                    </Link>
                  </>
                )}
              </FlexContainer>
            )}
          </Spacing>

          {usage && (
            <Spacing mr={PADDING_UNITS}>
              <Flex flexDirection="column">
                <Text monospace muted xsmall>
                  CPU: {usage?.kernel_cpu}{typeof usage?.kernel_cpu !== 'undefined' && '%'}
                </Text>
                <Text monospace muted xsmall>
                  Memory: {kernelMemory}
                </Text>
              </Flex>
            </Spacing>
          )}
        </FlexContainer>

        <Spacing px={PADDING_UNITS}>
          <Flex alignItems="center">
            <Tooltip
              appearBefore
              block
              description={
                <>
                  <FlexContainer alignItems="center">
                    <Text default inline>Press</Text>&nbsp;<KeyboardText
                      inline
                      keyText={isMac() ? KEY_SYMBOL_META : KEY_SYMBOL_CONTROL}
                    />&nbsp;<Text default inline>+</Text>&nbsp;<KeyboardText
                      inline
                      keyText={KEY_SYMBOL_S}
                    />&nbsp;<Text default inline>to save changes.</Text>
                    <br />
                  </FlexContainer>

                  <Spacing mt={1}>
                    <Text default>
                      Or, go to <Text inline monospace>
                        File
                      </Text>{' › '}<Text inline monospace>
                        Save pipeline
                      </Text>.
                    </Text>
                  </Spacing>
                </>
              }
              size={null}
              widthFitContent
            >
              <Text muted>
                {saveStatus}
              </Text>
            </Tooltip>

            <Spacing ml={2}/>

            {kernelStatus}
          </Flex>
        </Spacing>
      </FlexContainer>
    </PipelineHeaderStyle>
  );
}

export default KernelStatus;
