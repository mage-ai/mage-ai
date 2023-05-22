import { useState } from 'react';

import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import dark from '@oracle/styles/themes/dark';
import { Close, FileFill } from '@oracle/icons';
import { FileTabStyle } from '../index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';
import { pauseEvent } from '@utils/events';

export type FileTabProps = {
  filesTouched?: {
    [path: string]: boolean;
  };
  onClickTab?: (filePath: string) => void;
  onClickTabClose?: (filePath: string) => void;
  renderTabTitle?: (filePath: string) => string;
  savePipelineContent?: () => void;
};

type FileTabPropsInternal = {
  filePath: string;
  isLast?: boolean;
  selected?: boolean;
  themeContext: any;
};

function FileTab({
  filePath,
  filesTouched = {},
  isLast,
  onClickTab,
  onClickTabClose,
  renderTabTitle,
  savePipelineContent,
  selected,
  themeContext,
}: FileTabProps & FileTabPropsInternal) {
  const [focused, setFocused] = useState<boolean>(false);

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
      >
        <FlexContainer
          alignItems="center"
          fullHeight
        >
          <Tooltip
            appearAbove
            appearBefore
            label={filePath}
            size={null}
            widthFitContent
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

              <Text muted={!selected}>
                {renderTabTitle ? renderTabTitle(filePath) : filePath}
              </Text>
            </FlexContainer>
          </Tooltip>

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
                  size={UNIT * 1.25}
                />
              )}
              {!focused && !selected && <div style={{ width: UNIT * 1.25 }} />}
            </Link>
          </Tooltip>
        </FlexContainer>
      </FileTabStyle>
    </FlexContainer>
  );
}

export default FileTab;
