import { useContext, useEffect, useMemo } from 'react';
import { ThemeContext } from 'styled-components';

import FileTab, { FileTabProps } from './Tab';
import FlexContainer from '@oracle/components/FlexContainer';
import { ThemeType } from '@oracle/styles/themes/constants';
import { goToWithQuery } from '@utils/routing';
import { remove } from '@utils/array';
import { useKeyboardContext } from '@context/Keyboard';

export type TabType = {
  label?: () => string;
  onClick?: (opts?: {
    onClickTab?: (filePath: string) => void;
  }) => void;
  uuid: string;
};

type FileTabsProps = {
  filePaths: string[];
  isSelectedFilePath?: (filePath: string, selectedFilePath: string) => boolean;
  selectedFilePath: string;
  tabsBefore?: TabType[];
} & FileTabProps;

function FileTabs({
  filePaths,
  isSelectedFilePath,
  onClickTab,
  onClickTabClose,
  selectedFilePath,
  tabsBefore,
  ...props
}: FileTabsProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const filePathsMemo =
    useMemo(() => filePaths.map(path => decodeURIComponent(path)), [filePaths]);
  const numberOfFilePaths = useMemo(() => filePathsMemo?.length || 0, [
    filePathsMemo,
  ]);

  return (
    <FlexContainer
      alignItems="center"
      fullHeight
      justifyContent="flex-start"
    >
      {tabsBefore?.length >= 1 && tabsBefore?.map(({
        label,
        onClick,
        uuid: uuidFileTab,
      }) => {
        const selected: boolean = isSelectedFilePath
          ? isSelectedFilePath(uuid, selectedFilePath)
          : selectedFilePath === encodeURIComponent(uuid);

        return (
          <FileTab
            onClickTab={() => onClick?.({
              onClickTab,
            })}
            renderTabTitle={() => label ? label?.() : uuid}
            selected={selected}
            themeContext={themeContext}
          />
        );
      })}

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
            onClickTab={onClickTab}
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
