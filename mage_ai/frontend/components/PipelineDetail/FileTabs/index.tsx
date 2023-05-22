import { useContext, useMemo } from 'react';
import { ThemeContext } from 'styled-components';

import FileTab, { FileTabProps } from './Tab';
import FlexContainer from '@oracle/components/FlexContainer';
import { ThemeType } from '@oracle/styles/themes/constants';
import { goToWithQuery } from '@utils/routing';
import { remove } from '@utils/array';

type FileTabsProps = {
  filePaths: string[];
  isSelectedFilePath?: (filePath: string, selectedFilePath: string) => boolean;
  selectedFilePath: string;
} & FileTabProps;

function FileTabs({
  filePaths,
  isSelectedFilePath,
  onClickTabClose,
  selectedFilePath,
  ...props
}: FileTabsProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const filePathsMemo =
    useMemo(() => filePaths.map(path => decodeURIComponent(path)), [filePaths]);
  const numberOfFilePaths = useMemo(() => filePathsMemo?.length, [filePathsMemo]);

  return (
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
            onClickTabClose={(fp: string) => {
              if (onClickTabClose) {
                onClickTabClose(fp);
              } else {
                const newFilePaths = remove(filePathsMemo, path => path === fp)
                  .map(path => encodeURIComponent(path));

                goToWithQuery({
                  file_path: newFilePaths[newFilePaths.length - 1] || null,
                  'file_paths[]': newFilePaths,
                }, {
                  pushHistory: true,
                });
              }
            }}
            selected={selected}
            themeContext={themeContext}
          />
        );
      })}
    </FlexContainer>
  );
}

export default FileTabs;
