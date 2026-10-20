import { useContext, useMemo } from 'react';
import { ThemeContext } from 'styled-components';

import FileTab, { FileTabProps } from './Tab';
import FlexContainer from '@oracle/components/FlexContainer';
import { ThemeType } from '@oracle/styles/themes/constants';
import { goToWithQuery } from '@utils/routing';
import { remove } from '@utils/array';

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
  shouldDisableClose?: (uuid: string) => boolean;
  tabsBefore?: TabType[];
} & FileTabProps;

export function useFileTabs({
  filePaths,
  filesTouched,
  isSelectedFilePath,
  onClickTab,
  onClickTabClose,
  onContextMenu,
  renderTabIcon,
  renderTabTitle,
  savePipelineContent,
  selectedFilePath,
  shouldDisableClose,
  tabsBefore,
}: FileTabsProps) {
  const themeContext: ThemeType = useContext(ThemeContext);
  const filePathsMemo =
    useMemo(() => filePaths?.map(path => decodeURIComponent(path)), [filePaths]);
  const numberOfFilePaths = useMemo(() => filePathsMemo?.length || 0, [
    filePathsMemo,
  ]);

  const tabsBeforeMemo = useMemo(() => tabsBefore?.length >= 1 ? tabsBefore?.map(({
    label,
    onClick,
    uuid: uuidFileTab,
  }) => {
    const selected: boolean = isSelectedFilePath
      ? isSelectedFilePath(uuidFileTab, selectedFilePath)
      : selectedFilePath === encodeURIComponent(uuidFileTab);

    return (
      <FileTab
        key={uuidFileTab}
        onClickTab={() => onClick?.({
          onClickTab,
        })}
        renderTabTitle={() => label ? label?.() : uuidFileTab}
        selected={selected}
        themeContext={themeContext}
      />
    );
  }) : [], [
      isSelectedFilePath,
      onClickTab,
      selectedFilePath,
      tabsBefore,
      themeContext,
    ]);

  const tabsMemo = useMemo(() => filePathsMemo?.map((filePath: string, idx: number) => {
    const selected: boolean = isSelectedFilePath
      ? isSelectedFilePath(filePath, selectedFilePath)
      : selectedFilePath === encodeURIComponent(filePath);

    return (
      <FileTab
        disableClose={shouldDisableClose && shouldDisableClose?.(filePath)}
        savePipelineContent={savePipelineContent}
        filesTouched={filesTouched}
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
        onContextMenu={onContextMenu}
        renderTabIcon={renderTabIcon}
        renderTabTitle={renderTabTitle}
        selected={selected}
        themeContext={themeContext}
      />
    );
  }), [
    filePathsMemo,
    filesTouched,
    isSelectedFilePath,
    numberOfFilePaths,
    onClickTab,
    onClickTabClose,
    onContextMenu,
    renderTabIcon,
    renderTabTitle,
    savePipelineContent,
    selectedFilePath,
    shouldDisableClose,
    themeContext,
  ]);

  return {
    tabs: tabsMemo,
    tabsBefore: tabsBeforeMemo,
  };
}

export function FileTabs({
  children,
  ...props
}: {
  children?: any;
} & FileTabsProps) {
  return (
    <FlexContainer
      alignItems="center"
      fullHeight
      justifyContent="flex-start"
    >
      {useFileTabs(props)?.tabs}

      {children}
    </FlexContainer>
  );
}

export default FileTabs;
