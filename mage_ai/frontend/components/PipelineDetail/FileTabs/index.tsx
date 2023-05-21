import { useContext, useMemo } from 'react';
import { ThemeContext } from 'styled-components';

import FileTab, { FileTabProps } from './Tab';
import FlexContainer from '@oracle/components/FlexContainer';
import { PipelineHeaderStyle } from '../index.style';
import { ThemeType } from '@oracle/styles/themes/constants';

type FileTabsProps = {
  filePaths: string[];
  isSelectedFilePath?: (filePath: string, selectedFilePath: string) => boolean;
  selectedFilePath: string;
} & FileTabProps;

function FileTabs({
  filePaths,
  isSelectedFilePath,
  selectedFilePath,
  ...props
}: FileTabsProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const filePathsMemo =
    useMemo(() => filePaths.map(path => decodeURIComponent(path)), [filePaths]);
  const numberOfFilePaths = useMemo(() => filePathsMemo?.length, [filePathsMemo]);

  return (
    <PipelineHeaderStyle relativePosition secondary>
      <FlexContainer
        alignItems="center"
        justifyContent="flex-start"
      >
        {filePathsMemo?.map((filePath: string, idx: number) => {
          const selected: boolean = isSelectedFilePath
            ? isSelectedFilePath(filePath, selectedFilePath)
            : selectedFilePath === encodeURIComponent(filePath);

          return (
            <FileTab
              {...props}
              filePath={filePath}
              isLast={idx === numberOfFilePaths - 1}
              key={filePath}
              selected={selected}
              themeContext={themeContext}
            />
          );
        })}
      </FlexContainer>
    </PipelineHeaderStyle>
  );
}

export default FileTabs;
