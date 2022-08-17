import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';

import Circle from '@oracle/elements/Circle';
import ClickOutside from '@oracle/components/ClickOutside';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import KernelType from '@interfaces/KernelType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import LabelWithValueClicker from '@oracle/components/LabelWithValueClicker';
import Link from '@oracle/elements/Link';
import PipelineType, { PipelineTypeEnum, PIPELINE_TYPE_TO_KERNEL_NAME } from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import dark from '@oracle/styles/themes/dark';
import { Close, FileFill } from '@oracle/icons';
import { FileTabStyle, PipelineHeaderStyle } from './index.style';
import {
  KEY_CODE_ENTER,
  KEY_CODE_META,
} from '@utils/hooks/keyboardShortcuts/constants';
import { ThemeType } from '@oracle/styles/themes/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { dateFormatLongFromUnixTimestamp } from '@utils/string';
import { goToWithQuery } from '@utils/routing';
import { remove } from '@utils/array';
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
  selectedFilePath?: string;
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
  selectedFilePath,
  updatePipelineMetadata,
}: KernelStatusProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const {
    alive,
    name,
  } = kernel || {};
  const [isEditingPipeline, setIsEditingPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [showSelectKernel, setShowSelectKernel] = useState(false);

  const refSelectKernel = useRef(null);

  useEffect(() => {
    if (pipeline?.uuid) {
      setNewPipelineName(pipeline.uuid);
    }
  }, [pipeline?.uuid]);

  const filePaths =
    useMemo(() => filePathsProp.map(path => decodeURIComponent(path)), [filePathsProp]);
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

  const uuidKeyboard = `KernelStatus`;
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
        updatePipelineMetadata(newPipelineName);
        setIsEditingPipeline(false);
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
    </div>
  ), [
    alive,
    isBusy,
    pipeline,
    showSelectKernel,
    setShowSelectKernel,
    themeContext,
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

          {filePaths?.map((filePath: string) => {
            const selected: boolean = selectedFilePath === encodeURIComponent(filePath);

            return (
              <FlexContainer
                flexDirection="column"
                fullHeight
                justifyContent="flex-end"
                key={filePath}
                // @ts-ignore
                onClick={(e) => {
                  e.preventDefault();
                  if (!selected) {
                    goToWithQuery({
                      file_path: encodeURIComponent(filePath),
                    });
                  }
                }}
              >
                <FileTabStyle
                  selected={selected}
                >
                  <FlexContainer
                    alignItems="center"
                    fullHeight
                  >
                    {!filesTouched[filePath] && (
                      <FileFill
                        muted={!selected}
                        size={UNIT * 1.5}
                      />
                    )}

                    {filesTouched[filePath] && (
                      <Tooltip
                        label="Unsaved changes"
                        size={null}
                        widthFitContent
                      >
                        <div style={{ padding: 1 }}>
                          <Circle
                            borderColor={(themeContext || dark).borders.danger}
                            size={UNIT * 1.25}
                          />
                        </div>
                      </Tooltip>
                    )}

                    <Spacing mr={1} />

                    <Text
                      muted={!selected}
                    >
                      {filePath}
                    </Text>

                    <Spacing mr={2} />

                    {selected && (
                      <Tooltip
                        label="Close"
                        size={null}
                        widthFitContent
                      >
                        <Link
                          autoHeight
                          block
                          noHoverUnderline
                          noOutline
                          onClick={() => {
                            const newFilePaths = remove(filePaths, path => path === filePath)
                              .map(path => encodeURIComponent(path));

                            goToWithQuery({
                              file_path: newFilePaths[newFilePaths.length - 1] || null,
                              'file_paths[]': newFilePaths,
                            }, {
                              pushHistory: true,
                            });
                          }}
                          preventDefault
                        >
                          <Close
                            size={UNIT * 1.25}
                          />
                        </Link>
                      </Tooltip>
                    )}
                    {!selected && <div style={{ width: UNIT * 1.25 }} />}
                  </FlexContainer>
                </FileTabStyle>

              </FlexContainer>
            );
          })}
        </FlexContainer>

        {!selectedFilePath && (
          <Spacing px={PADDING_UNITS}>
            <Flex alignItems="center">
              {kernelStatus}
              <Spacing ml={2}/>
              <Text muted>
                {saveStatus}
              </Text>
            </Flex>
          </Spacing>
        )}
      </FlexContainer>
    </PipelineHeaderStyle>
  );
}

export default KernelStatus;
