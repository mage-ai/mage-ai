import { useContext, useMemo } from 'react';
import { ThemeContext } from 'styled-components';

import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import dark from '@oracle/styles/themes/dark';
import { Close, FileFill } from '@oracle/icons';
import { FileTabStyle, PipelineHeaderStyle } from '../index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { ThemeType } from '@oracle/styles/themes/constants';
import { goToWithQuery } from '@utils/routing';
import { remove } from '@utils/array';

type FileTabsProps = {
  filePaths: string[];
  filesTouched: {
    [path: string]: boolean;
  };
  savePipelineContent: () => void;
  selectedFilePath: string;
};

function FileTabs({
  filePaths,
  filesTouched,
  savePipelineContent,
  selectedFilePath,
}: FileTabsProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const filePathsMemo =
  useMemo(() => filePaths.map(path => decodeURIComponent(path)), [filePaths]);

  return (
    <PipelineHeaderStyle relativePosition secondary>
      <FlexContainer
        alignItems="center"
        justifyContent="flex-start"
      >
        {filePathsMemo?.map((filePath: string, idx: number) => {
          const selected: boolean = selectedFilePath === encodeURIComponent(filePath);

          return (
            <FlexContainer
              flexDirection="column"
              fullHeight
              key={filePath}
              // @ts-ignore
              onClick={(e) => {
                e.preventDefault();
                if (!selected) {
                  savePipelineContent();
                  goToWithQuery({
                    file_path: encodeURIComponent(filePath),
                  });
                }
              }}
            >
              <FileTabStyle
                last={idx === filePathsMemo.length - 1}
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
                      appearAbove
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
                          const newFilePaths = remove(filePathsMemo, path => path === filePath)
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
    </PipelineHeaderStyle>
  );
}

export default FileTabs;
