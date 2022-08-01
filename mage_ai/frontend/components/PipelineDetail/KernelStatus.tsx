import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';

import Circle from '@oracle/elements/Circle';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelType from '@interfaces/KernelType';
import LabelWithValueClicker from '@oracle/components/LabelWithValueClicker';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import dark from '@oracle/styles/themes/dark';
import { Close, FileFill } from '@oracle/icons';
import { FileTabStyle, PipelineHeaderStyle } from './index.style';
import { ThemeType } from '@oracle/styles/themes/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { dateFormatLongFromUnixTimestamp } from '@utils/string';
import { goToWithQuery } from '@utils/routing';
import { remove } from '@utils/array';

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
  updatePipelineName: (name: string) => void;
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
  updatePipelineName,
}: KernelStatusProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const {
    alive,
    name,
  } = kernel || {};
  const [isEditingPipeline, setIsEditingPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');

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

  const pipelineName = useMemo(() => (
    <Flex alignItems="center">
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

      <FlexContainer alignItems="center">
        <Text>
          Pipeline:&nbsp;{selectedFilePath && pipeline?.uuid}
        </Text>
        {!selectedFilePath && pipelineNameInput}
      </FlexContainer>

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
                <Tooltip
                  block
                  label={alive ? `${name} kernel is ${isBusy ? 'busy' : 'alive'}` : 'Kernel is dead'}
                  size={null}
                  widthFitContent
                >
                  {pipelineName}
                </Tooltip>
                {isEditingPipeline && (
                  <>
                    <Spacing ml={1} />
                    <Link
                      onClick={() => {
                        updatePipelineName(newPipelineName);
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
            <Text muted>
              {saveStatus}
            </Text>
          </Spacing>
        )}
      </FlexContainer>
    </PipelineHeaderStyle>
  );
}

export default KernelStatus;
