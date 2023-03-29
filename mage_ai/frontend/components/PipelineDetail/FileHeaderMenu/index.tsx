import { useEffect, useMemo, useRef, useState } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import KernelOutputType from '@interfaces/KernelOutputType';
import Text from '@oracle/elements/Text';
import {
  KEY_CODE_NUMBERS_TO_NUMBER,
  KEY_CODE_NUMBER_0,
  KEY_SYMBOL_CONTROL,
  KEY_SYMBOL_I,
  KEY_SYMBOL_META,
  KEY_SYMBOL_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import {
  KEY_CODE_ARROW_LEFT,
  KEY_CODE_ARROW_RIGHT,
} from '@utils/hooks/keyboardShortcuts/constants';
import { LinkStyle } from './index.style';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { isMac } from '@utils/os';
import { randomNameGenerator } from '@utils/string';
import { useKeyboardContext } from '@context/Keyboard';

const NUMBER_OF_TOP_MENU_ITEMS: number = 2;

type FileHeaderMenuProps = {
  cancelPipeline: () => void;
  createPipeline: (data: any) => void;
  executePipeline: () => void;
  interruptKernel: () => void;
  isPipelineExecuting: boolean;
  restartKernel: () => void;
  savePipelineContent: () => void;
  setMessages: (message: {
    [uuid: string]: KernelOutputType[];
  }) => void;
};

function FileHeaderMenu({
  cancelPipeline,
  createPipeline,
  executePipeline,
  interruptKernel,
  isPipelineExecuting,
  restartKernel,
  savePipelineContent,
  setMessages,
}: FileHeaderMenuProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const refFile = useRef(null);
  const refRun = useRef(null);

  const fileItems = [
    {
      label: () => 'New standard pipeline',
      // @ts-ignore
      onClick: () => createPipeline({
        pipeline: {
          name: randomNameGenerator(),
        },
      }),
      uuid: 'new_standard_pipeline',
    },
    {
      label: () => 'New streaming pipeline',
      // @ts-ignore
      onClick: () => createPipeline({
        pipeline: {
          name: randomNameGenerator(),
          type: PipelineTypeEnum.STREAMING,
        },
      }),
      uuid: 'new_streaming_pipeline',
    },
    {
      label: () => 'Save pipeline',
      keyTextGroups: [[
        isMac() ? KEY_SYMBOL_META : KEY_SYMBOL_CONTROL,
        KEY_SYMBOL_S,
      ]],
      onClick: () => savePipelineContent(),
      uuid: 'save_pipeline',
    },
  ];
  const runItems = useMemo(() => {
    const items = [
      // TODO (tommy dang): add onClick functions to these 2 menu items
      // {
      //   label: () => 'Run selected block',
      //   keyTextGroups: [[KEY_SYMBOL_META, KEY_SYMBOL_ENTER]],
      //   uuid: 'Run selected block',
      // },
      // {
      //   label: () => 'Delete selected block',
      //   keyTextGroups: [
      //     [KEY_SYMBOL_D],
      //     [KEY_SYMBOL_D],
      //   ],
      //   uuid: 'Delete selected block',
      // },
      {
        label: () => 'Interrupt kernel',
        keyTextGroups: [
          [KEY_SYMBOL_I],
          [KEY_SYMBOL_I],
        ],
        onClick: () => interruptKernel(),
        uuid: 'Interrupt kernel',
      },
      {
        label: () => 'Restart kernel',
        keyTextGroups: [
          [KEY_CODE_NUMBERS_TO_NUMBER[KEY_CODE_NUMBER_0]],
          [KEY_CODE_NUMBERS_TO_NUMBER[KEY_CODE_NUMBER_0]],
        ],
        onClick: () => restartKernel(),
        uuid: 'Restart kernel',
      },
      {
        label: () => 'Clear all outputs',
        // @ts-ignore
        onClick: () => setMessages(messagesByUUID => Object
          .keys(messagesByUUID)
          .reduce((acc, uuid) => ({
            ...acc,
            [uuid]: [],
          }), {}),
        ),
        uuid: 'Clear all outputs',
      },
    ];

    if (isPipelineExecuting) {
      items.push({
        label: () => 'Cancel pipeline',
        onClick: () => cancelPipeline(),
        uuid: 'Cancel pipeline',
      });
    } else {
      items.push({
        label: () => 'Execute pipeline',
        onClick: () => executePipeline(),
        uuid: 'Execute pipeline',
      });
    }

    return items;
  }, [
    cancelPipeline,
    executePipeline,
    interruptKernel,
    isPipelineExecuting,
    restartKernel,
    setMessages,
  ]);

  const uuidKeyboard = 'FileHeaderMenu/index';
  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();
  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping, keyHistory) => {
      if (highlightedIndex === null) {
        return;
      }

      if (keyMapping[KEY_CODE_ARROW_LEFT]) {
        setHighlightedIndex(idx => idx === 0 ? NUMBER_OF_TOP_MENU_ITEMS - 1 : idx - 1);
      } else if (keyMapping[KEY_CODE_ARROW_RIGHT]) {
        setHighlightedIndex(idx => idx === NUMBER_OF_TOP_MENU_ITEMS - 1 ? 0 : idx + 1);
      }
    },
    [
      highlightedIndex,
      setHighlightedIndex,
    ],
  );

  return (
    <ClickOutside
      onClickOutside={() => setHighlightedIndex(null)}
      open
      style={{
        position: 'relative',
      }}
    >
      <FlexContainer>
        <div style={{ position: 'relative' }}>
          <LinkStyle
            highlighted={highlightedIndex === 0}
            onClick={() => setHighlightedIndex(val => val === 0 ? null : 0)}
            onMouseEnter={() => setHighlightedIndex(val => val !== null ? 0 : null)}
            ref={refFile}
          >
            <Text>
              File
            </Text>
          </LinkStyle>

          <FlyoutMenu
            items={fileItems}
            onClickCallback={() => setHighlightedIndex(null)}
            open={highlightedIndex === 0}
            parentRef={refFile}
            uuid="FileHeaderMenu/file_items"
          />
        </div>

        <div style={{ position: 'relative' }}>
          <LinkStyle
            highlighted={highlightedIndex === 1}
            onClick={() => setHighlightedIndex(val => val === 1 ? null : 1)}
            onMouseEnter={() => setHighlightedIndex(val => val !== null ? 1 : null)}
            ref={refRun}
          >
            <Text>
              Run
            </Text>
          </LinkStyle>

          <FlyoutMenu
            items={runItems}
            onClickCallback={() => setHighlightedIndex(null)}
            open={highlightedIndex === 1}
            parentRef={refRun}
            uuid="FileHeaderMenu/run_items"
          />
        </div>
      </FlexContainer>
    </ClickOutside>
  );
}

export default FileHeaderMenu;
