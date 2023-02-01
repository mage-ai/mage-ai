import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';
import { useMutation } from 'react-query';

import Circle from '@oracle/elements/Circle';
import ClickOutside from '@oracle/components/ClickOutside';
import ClusterType, { ClusterStatusEnum } from '@interfaces/ClusterType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import KernelType from '@interfaces/KernelType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import KeyboardText from '@oracle/elements/KeyboardText';
import LabelWithValueClicker from '@oracle/components/LabelWithValueClicker';
import Link from '@oracle/elements/Link';
import PipelineType, { PipelineTypeEnum, PIPELINE_TYPE_TO_KERNEL_NAME } from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import dark from '@oracle/styles/themes/dark';

import { Check } from '@oracle/icons';
import { CloudProviderSparkClusterEnum } from '@interfaces/CloudProviderType';
import {
  KEY_CODE_ENTER,
  KEY_CODE_META,
  KEY_SYMBOL_CONTROL,
  KEY_SYMBOL_META,
  KEY_SYMBOL_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PipelineHeaderStyle } from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import { dateFormatLongFromUnixTimestamp } from '@utils/date';
import { find } from '@utils/array';
import { goToWithQuery } from '@utils/routing';
import { isMac } from '@utils/os';
import { onSuccess } from '@api/utils/response';
import { useKeyboardContext } from '@context/Keyboard';

type KernelStatusProps = {
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
  setErrors: (opts: {
    errors: any;
    response: any;
  }) => void;
  updatePipelineMetadata: (name: string, type?: string) => void;
};

function KernelStatus({
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
  updatePipelineMetadata,
}: KernelStatusProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const {
    alive,
    name,
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
  } = api.clusters.detail(selectedSparkClusterType);
  const clusters: ClusterType[] = useMemo(() => dataClusters?.clusters || [], dataClusters);
  const selectedCluster = find(clusters, ({ is_active: isActive }) => isActive);

  const [updateCluster, { isLoading: isLoadingUpdateCluster }] = useMutation(
    api.clusters.useUpdate(selectedSparkClusterType),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (response) => {
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
    saveStatus = `Last saved ${dateFormatLongFromUnixTimestamp(Number(pipelineLastSaved) / 1000)}`;
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

  const pipelineNameInput = useMemo(() => (
    <LabelWithValueClicker
      bold={false}
      inputValue={newPipelineName}
      notRequired
      onBlur={() => setTimeout(() => setIsEditingPipeline(false), 300)}
      onChange={(e) => {
        setNewPipelineName(e.target.value);
        e.preventDefault();
      }}
      onClick={() => setIsEditingPipeline(true)}
      onFocus={() => setIsEditingPipeline(true)}
      stacked
      value={isEditingPipeline ? null : (pipeline?.uuid || '')}
    />
  ), [
    isEditingPipeline,
    newPipelineName,
    pipeline,
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
                              is_active: true,
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
                }))
            ]}
            onClickCallback={() => setShowSelectKernel(false)}
            open={showSelectKernel}
            parentRef={refSelectKernel}
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
  ]);

  const pipelineName = useMemo(() => (
    <Flex alignItems="center">
      <Text>
        Pipeline:&nbsp;{selectedFilePath && pipeline?.uuid}
      </Text>
      {!selectedFilePath && pipelineNameInput}

      <Spacing mr={3} />
    </Flex>
  ), [
    alive,
    isBusy,
    pipeline,
    pipelineNameInput,
    selectedFilePath,
    themeContext,
  ]);

  return (
    <PipelineHeaderStyle>
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
                {pipelineName}
              </Link>
            )}

            {!selectedFilePath && (
              <FlexContainer alignItems="center">
                {pipelineName}
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
        </FlexContainer>

        <Spacing px={PADDING_UNITS}>
          <Flex alignItems="center">
            {kernelStatus}
            <Spacing ml={2}/>
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
          </Flex>
        </Spacing>
      </FlexContainer>
    </PipelineHeaderStyle>
  );
}

export default KernelStatus;
