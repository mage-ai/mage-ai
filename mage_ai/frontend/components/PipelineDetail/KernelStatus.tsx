import {
  useContext,
  useMemo,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';

import Circle from '@oracle/elements/Circle';
import FileType from '@interfaces/FileType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelType from '@interfaces/KernelType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import LabelWithValueClicker from '@oracle/components/LabelWithValueClicker';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import dark from '@oracle/styles/themes/dark';
import { Close, FileFill } from '@oracle/icons';
import { FileTabStyle, PipelineHeaderStyle } from './index.style';
import {
  KEY_CODE_NUMBERS_TO_NUMBER,
  KEY_CODE_NUMBER_0,
} from '@utils/hooks/keyboardShortcuts/constants';
import { ThemeType } from '@oracle/styles/themes/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { dateFormatLongFromUnixTimestamp } from '@utils/string';
import { goToWithQuery } from '@utils/routing';
import { remove } from '@utils/array';

type KernelStatusProps = {
  filePaths: string[];
  isBusy: boolean;
  isPipelineUpdating: boolean;
  kernel: KernelType;
  pipeline: PipelineType;
  pipelineContentTouched: boolean;
  pipelineLastSaved: Date;
  restartKernel: () => void;
  selectedFile: FileType;
  updatePipelineName: (name: string) => void;
};

function KernelStatus({
  filePaths: filePathsProp,
  isBusy,
  isPipelineUpdating,
  kernel,
  pipeline,
  pipelineContentTouched,
  pipelineLastSaved,
  restartKernel,
  selectedFile,
  updatePipelineName,
}: KernelStatusProps) {
  const [isEditingPipeline, setIsEditingPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState(pipeline?.uuid);
  
  const [restartKernelVisible, setRestartKernelVisible] = useState(false);
  const themeContext: ThemeType = useContext(ThemeContext);
  const {
    alive,
    name,
  } = kernel || {};
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
          <Tooltip
            label={(
              <Text>
                Current working directory is <Text inline monospace>
                  /home/src
                </Text>
              </Text>
            )}
            size={null}
            widthFitContent
          >
            <Flex alignItems="center">
              <Text>Pipeline:&nbsp;</Text>

              <FlexContainer alignItems="center">
                <LabelWithValueClicker
                  bold={false}
                  inputValue={newPipelineName}
                  monospace
                  notRequired
                  onBlur={() => setTimeout(() => setIsEditingPipeline(false), 300)}
                  onChange={(e) => {
                    setNewPipelineName(e.target.value);
                  }}
                  onClick={() => setIsEditingPipeline(true)}
                  onFocus={() => setIsEditingPipeline(true)}
                  stacked
                  value={!isEditingPipeline && pipeline?.uuid}
                />

                {isEditingPipeline && (
                  <>
                    <Spacing ml={1} />
                    <Link
                      onClick={() => updatePipelineName(newPipelineName)}
                      preventDefault
                      sameColorAsText
                      small
                    >
                      Update name
                    </Link>
                  </>
                )}
              </FlexContainer>

              <Spacing mr={PADDING_UNITS} />

              <Text muted>
                {saveStatus}
              </Text>
            </Flex>
          </Tooltip>

          {filePaths?.length >= 0 && <Spacing mr={5} />}

          {filePaths?.map((filePath: string) => {
            const selected: boolean = selectedFile?.path.includes(filePath);

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
                    <FileFill
                      muted={!selected}
                      size={UNIT * 1.5}
                    />

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

        {!filePaths?.length && (
          <Flex
            alignItems="center"
            // @ts-ignore
            onMouseEnter={() => setRestartKernelVisible(true)}
            // @ts-ignore
            onMouseLeave={() => setRestartKernelVisible(false)}
          >
            {(!alive || restartKernelVisible) && (
              <KeyboardShortcutButton
                compact
                inline
                keyTextGroups={[
                  [KEY_CODE_NUMBERS_TO_NUMBER[KEY_CODE_NUMBER_0]],
                  [KEY_CODE_NUMBERS_TO_NUMBER[KEY_CODE_NUMBER_0]],
                ]}
                onClick={() => restartKernel()}
                uuid="KernelStatus/restartKernel"
              >
                {alive ? 'Restart' : 'Start'} kernel
              </KeyboardShortcutButton>
            )}

            <Spacing mr={1} my={2} />

            <Tooltip
              block
              label={alive
                ? 'Kernel is alive and well.'
                : 'Kernel has not started or died, please restart.'
              }
              size={null}
              widthFitContent
            >
              <FlexContainer
                alignItems="center"
              >
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

                <Spacing mr={1} />

                <Text>
                  {alive ? `${name} kernel is ${isBusy ? 'busy' : 'alive'}` : 'Kernel is dead'}
                </Text>
              </FlexContainer>
            </Tooltip>
          </Flex>
        )}

      </FlexContainer>
    </PipelineHeaderStyle>
  );
}

export default KernelStatus;
