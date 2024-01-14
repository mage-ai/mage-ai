import { useState } from 'react';

import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import dark from '@oracle/styles/themes/dark';
import useFileIcon from '@components/FileBrowser/Folder/useFileIcon';
import { Close, FileFill } from '@oracle/icons';
import { FileTabStyle } from '../index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';
import { pauseEvent } from '@utils/events';

const ICON_SIZE = UNIT * 1.25;

export type FileTabProps = {
  filesTouched?: {
    [path: string]: boolean;
  };
  onClickTab?: (filePath: string) => void;
  onClickTabClose?: (filePath: string) => void;
  onContextMenu?: (event: any, filePath: string) => void;
  renderTabIcon?: (uuid: string) => JSX.Element;
  renderTabTitle?: (filePath: string) => string;
  savePipelineContent?: () => void;
};

type FileTabPropsInternal = {
  disableClose?: boolean;
  filePath?: string;
  isLast?: boolean;
  selected?: boolean;
  themeContext: any;
};

function FileTab({
  disableClose,
  filePath,
  filesTouched = {},
  isLast,
  onClickTab,
  onClickTabClose,
  onContextMenu,
  renderTabIcon,
  renderTabTitle,
  savePipelineContent,
  selected,
  themeContext,
}: FileTabProps & FileTabPropsInternal) {
  const [focused, setFocused] = useState<boolean>(false);

  const {
    BlockIcon,
    Icon,
    color,
    iconColor,
    isBlockFile,
  } = useFileIcon({
    filePath,
    name: filePath,
    uuid: filePath,
  });

  return (
    <FlexContainer
      flexDirection="column"
      fullHeight
      // @ts-ignore
      onClick={(e) => {
        e.preventDefault();
        if (!selected) {
          if (onClickTab) {
            onClickTab(filePath);
          } else {
            savePipelineContent?.();
            goToWithQuery({
              file_path: encodeURIComponent(filePath),
            });
          }
        }
      }}
      onMouseEnter={() => setFocused(true)}
      onMouseLeave={() => setFocused(false)}
    >
      <FileTabStyle
        last={isLast}
        selected={selected}
        onContextMenu={e => onContextMenu(e, filePath)}
      >
        <FlexContainer
          alignItems="center"
          fullHeight
        >
          <Tooltip
            appearAbove
            label={filePath}
            size={null}
            widthFitContent
          >
            <FlexContainer
              alignItems="center"
              fullHeight
            >
              {!filesTouched[filePath] && (
                <>
                  {renderTabIcon
                    ? renderTabIcon(filePath)
                    : isBlockFile
                      ?
                        <div
                          style={{
                            padding: 1,
                            justifyContent: 'center',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <BlockIcon
                            color={color}
                            size={10}
                            square
                          />
                        </div>
                      :
                        <Icon
                          fill={iconColor}
                          size={UNIT * 1.5}
                        />
                  }
                </>
              )}

              {filesTouched[filePath] && (
                <Tooltip
                  block
                  label="Unsaved changes"
                  size={null}
                  widthFitContent
                >
                  <div style={{ padding: 1 }}>
                    <Circle
                      borderColor={(themeContext || dark).borders.danger}
                      size={ICON_SIZE}
                    />
                  </div>
                </Tooltip>
              )}

              <Spacing mr={1} />

              <Text monospace muted={!selected} noWrapping small>
                {renderTabTitle ? renderTabTitle(filePath) : filePath}
              </Text>
            </FlexContainer>
          </Tooltip>

          {onClickTabClose && !disableClose && (
            <>
              <Spacing mr={2} />

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
                  onClick={(e) => {
                    pauseEvent(e);
                    onClickTabClose?.(filePath);
                  }}
                  preventDefault
                >
                  {(focused || selected) && (
                    <Close
                      muted={!selected}
                      size={ICON_SIZE}
                    />
                  )}
                  {!focused && !selected && <div style={{ width: ICON_SIZE }} />}
                </Link>
              </Tooltip>
            </>
          )}
        </FlexContainer>
      </FileTabStyle>
    </FlexContainer>
  );
}

export default FileTab;
