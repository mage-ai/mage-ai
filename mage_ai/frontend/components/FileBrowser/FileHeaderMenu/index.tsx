import {
  Dispatch,
  SetStateAction,
  useMemo,
  useRef,
  useState,
} from 'react';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { FileHeaderMenuContainerStyle } from './index.style';
import { PreviewHidden, PreviewOpen } from '@oracle/icons';
import { SHARED_FILE_HEADER_BUTTON_PROPS } from '@components/PipelineDetail/FileHeaderMenu/constants';

type FileHeaderMenuProps = {
  showHiddenFiles?: boolean;
  setShowHiddenFiles?: Dispatch<SetStateAction<boolean>>;
};

function FileHeaderMenu({
  setShowHiddenFiles,
  showHiddenFiles,
}: FileHeaderMenuProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const refView = useRef(null);

  const viewItems = useMemo(() => [
    {
      label: () => (
        <FlexContainer alignItems="center">
          {showHiddenFiles
            ? <PreviewOpen success />
            : <PreviewHidden muted />
          }

          <Spacing mr={1} />

          <Text noWrapping>
            Hidden files
          </Text>
        </FlexContainer>
      ),
      onClick: () => {
        setShowHiddenFiles(prevState => !prevState);
      },
      uuid: 'Hidden files',
    },
  ], [setShowHiddenFiles, showHiddenFiles]);

  return (
    <FileHeaderMenuContainerStyle>
      <ClickOutside
        onClickOutside={() => setHighlightedIndex(null)}
        open
        style={{
          width: 'fit-content',
        }}
      >
        <FlexContainer
          alignItems="center"
          fullHeight
        >
          <div style={{ position: 'relative' }}>
            <Button
              {...SHARED_FILE_HEADER_BUTTON_PROPS}
              noBackground={highlightedIndex !== 0}
              onClick={() => setHighlightedIndex(val => val === 0 ? null : 0)}
              onMouseEnter={() => setHighlightedIndex(val => val !== null ? 0 : null)}
              ref={refView}
            >
              <Text default>
                View
              </Text>
            </Button>

            <FlyoutMenu
              alternateBackground
              items={viewItems}
              onClickCallback={() => setHighlightedIndex(null)}
              open={highlightedIndex === 0}
              parentRef={refView}
              uuid="FileBrowser/FileHeaderMenu/view"
            />
          </div>
        </FlexContainer>
      </ClickOutside>
    </FileHeaderMenuContainerStyle>
  );
}

export default FileHeaderMenu;
