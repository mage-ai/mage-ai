import { useEffect, useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FileHeaderMenuItem, { blankIcon } from './FileHeaderMenuItem';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import KernelOutputType from '@interfaces/KernelOutputType';
import PipelineType, {
  KERNEL_NAME_TO_PIPELINE_TYPE,
  PipelineTypeEnum,
} from '@interfaces/PipelineType';
import Text from '@oracle/elements/Text';
import useKernel from '@utils/models/kernel/useKernel';
import useProject from '@utils/models/project/useProject';
import {
  Check,
  LayoutSplit,
  LayoutStacked,
} from '@oracle/icons';
import { KernelNameEnum } from '@interfaces/KernelType';
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
import { SHARED_FILE_HEADER_BUTTON_PROPS } from './constants';
import { isMac } from '@utils/os';
import { randomNameGenerator } from '@utils/string';
import { useKeyboardContext } from '@context/Keyboard';

const NUMBER_OF_TOP_MENU_ITEMS: number = 3;
const INDEX_COMPUTE = 4;

type FileHeaderMenuProps = {
  cancelPipeline: () => void;
  children?: any;
  collapseAllBlockOutputs?: (state: boolean) => void;
  createPipeline: (data: any) => void;
  disableAutosave?: boolean;
  executePipeline: () => void;
  hideOutputOnExecution?: boolean;
  interruptKernel: () => void;
  isPipelineExecuting: boolean;
  pipeline: PipelineType;
  restartKernel: () => void;
  savePipelineContent: () => void;
  scrollTogether?: boolean;
  setMessages: (message: {
    [uuid: string]: KernelOutputType[];
  }) => void;
  setScrollTogether?: (prev: any) => void;
  setSideBySideEnabled?: (prev: any) => void;
  sideBySideEnabled?: boolean;
  toggleDisableAutosave?: () => void;
  toggleHideOutputOnExecution?: () => void;
  updatePipelineMetadata: (name: string, type?: string) => void;
};

function FileHeaderMenu({
  cancelPipeline,
  children,
  collapseAllBlockOutputs,
  createPipeline,
  disableAutosave,
  executePipeline,
  hideOutputOnExecution,
  interruptKernel,
  isPipelineExecuting,
  pipeline,
  restartKernel,
  savePipelineContent,
  scrollTogether,
  setMessages,
  setScrollTogether,
  setSideBySideEnabled,
  sideBySideEnabled,
  toggleDisableAutosave,
  toggleHideOutputOnExecution,
  updatePipelineMetadata,
}: FileHeaderMenuProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const refFile = useRef(null);
  const refRun = useRef(null);
  const refEdit = useRef(null);
  const refView = useRef(null);
  const refCompute = useRef(null);

  const { kernel } = useKernel({ pipelineType: pipeline?.type });
  const {
    featureEnabled,
    featureUUIDs,
  } = useProject();

  const fileItems = [
    {
      beforeIcon: blankIcon,
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
      beforeIcon: blankIcon,
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
      beforeIcon: blankIcon,
      keyTextGroups: [[
        isMac() ? KEY_SYMBOL_META : KEY_SYMBOL_CONTROL,
        KEY_SYMBOL_S,
      ]],
      label: () => 'Save pipeline',
      onClick: () => savePipelineContent(),
      uuid: 'save_pipeline',
    },
    {
      beforeIcon: disableAutosave ? <Check /> : blankIcon,
      label: () => 'Disable autosave',
      onClick: toggleDisableAutosave,
      uuid: 'Disable_autosave',
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
        keyTextGroups: [
          [KEY_SYMBOL_I],
          [KEY_SYMBOL_I],
        ],
        label: () => 'Interrupt kernel',
        onClick: () => interruptKernel(),
        uuid: 'Interrupt kernel',
      },
      {
        keyTextGroups: [
          [KEY_CODE_NUMBERS_TO_NUMBER[KEY_CODE_NUMBER_0]],
          [KEY_CODE_NUMBERS_TO_NUMBER[KEY_CODE_NUMBER_0]],
        ],
        label: () => 'Restart kernel',
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
    } else if (pipeline?.type === PipelineTypeEnum.STREAMING) {
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
    pipeline?.type,
    restartKernel,
    setMessages,
  ]);

  const editItems = useMemo(() => [
    {
      label: () => 'Pipeline settings',
      linkProps: {
        as: `/pipelines/${pipeline?.uuid}/settings`,
        href: '/pipelines/[pipeline]/settings',
      },
      uuid: 'Pipeline settings',
    },
    {
      label: () => 'Browse custom templates',
      linkProps: {
        href: '/templates',
      },
      uuid: 'browse_custom_templates',
    },
    {
      label: () => 'Create custom templates',
      linkProps: {
        href: '/templates?new=1',
      },
      uuid: 'create_custom_templates',
    },
  ], [pipeline]);

  const viewItems = useMemo(() => [
    {
      label: () => (
        <FileHeaderMenuItem
          checked={hideOutputOnExecution}
          label="Hide output on execution"
        />
      ),
      onClick: toggleHideOutputOnExecution,
      uuid: 'Hide output on execution',
    },
  ], [
    hideOutputOnExecution,
    toggleHideOutputOnExecution,
  ]);

  const computeItems = useMemo(() => {
    const arr: {
      label: () => string;
      linkProps?: {
        href: string;
      };
      onClick?: () => void;
      uuid: string;
    }[] = [
    ];

    if (KernelNameEnum.PYTHON3 === kernel?.name) {
      arr.push({
        label: () => 'Switch to PySpark kernel',
        onClick: () => updatePipelineMetadata?.(
          pipeline?.name, KERNEL_NAME_TO_PIPELINE_TYPE[KernelNameEnum.PYSPARK],
        ),
        uuid: 'Switch to PySpark kernel',
      });
    } else if (KernelNameEnum.PYSPARK === kernel?.name) {
      arr.push({
        label: () => 'Switch to Python kernel',
        onClick: () => updatePipelineMetadata?.(
          pipeline?.name, KERNEL_NAME_TO_PIPELINE_TYPE[KernelNameEnum.PYTHON3],
        ),
        uuid: 'Switch to Python kernel',
      });
    }

    return arr;
  }, [
    kernel,
    pipeline,
    updatePipelineMetadata,
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
          <Button
            {...SHARED_FILE_HEADER_BUTTON_PROPS}
            noBackground={highlightedIndex !== 0}
            onClick={() => setHighlightedIndex(val => val === 0 ? null : 0)}
            onMouseEnter={() => setHighlightedIndex(val => val !== null ? 0 : null)}
            ref={refFile}
          >
            <Text>
              File
            </Text>
          </Button>

          <FlyoutMenu
            items={fileItems}
            onClickCallback={() => setHighlightedIndex(null)}
            open={highlightedIndex === 0}
            parentRef={refFile}
            uuid="FileHeaderMenu/file_items"
          />
        </div>

        <div style={{ position: 'relative' }}>
          <Button
            {...SHARED_FILE_HEADER_BUTTON_PROPS}
            noBackground={highlightedIndex !== 2}
            onClick={() => setHighlightedIndex(val => val === 2 ? null : 2)}
            onMouseEnter={() => setHighlightedIndex(val => val !== null ? 2 : null)}
            ref={refEdit}
          >
            <Text>
              Edit
            </Text>
          </Button>

          <FlyoutMenu
            items={editItems}
            onClickCallback={() => setHighlightedIndex(null)}
            open={highlightedIndex === 2}
            parentRef={refEdit}
            uuid="FileHeaderMenu/edit_items"
          />
        </div>

        <div style={{ position: 'relative' }}>
          <Button
            {...SHARED_FILE_HEADER_BUTTON_PROPS}
            noBackground={highlightedIndex !== 1}
            onClick={() => setHighlightedIndex(val => val === 1 ? null : 1)}
            onMouseEnter={() => setHighlightedIndex(val => val !== null ? 1 : null)}
            ref={refRun}
          >
            <Text>
              Run
            </Text>
          </Button>

          <FlyoutMenu
            items={runItems}
            onClickCallback={() => setHighlightedIndex(null)}
            open={highlightedIndex === 1}
            parentRef={refRun}
            uuid="FileHeaderMenu/run_items"
          />
        </div>

        {PipelineTypeEnum.INTEGRATION !== pipeline?.type
          && (
          <div style={{ position: 'relative' }}>
            <Button
              {...SHARED_FILE_HEADER_BUTTON_PROPS}
              noBackground={highlightedIndex !== 3}
              onClick={() => setHighlightedIndex(val => val === 3 ? null : 3)}
              onMouseEnter={() => setHighlightedIndex(val => val !== null ? 3 : null)}
              ref={refView}
            >
              <Text>
                View
              </Text>
            </Button>

            <FlyoutMenu
              items={viewItems}
              onClickCallback={() => setHighlightedIndex(null)}
              open={highlightedIndex === 3}
              parentRef={refView}
              uuid="FileHeaderMenu/viewItems"
            />
          </div>
        )}

        {featureEnabled?.(featureUUIDs.COMPUTE_MANAGEMENT) && (
          <div style={{ position: 'relative' }}>
            <Button
              {...SHARED_FILE_HEADER_BUTTON_PROPS}
              noBackground={highlightedIndex !== INDEX_COMPUTE}
              onClick={() => setHighlightedIndex(val => val === INDEX_COMPUTE ? null : INDEX_COMPUTE)}
              onMouseEnter={() => setHighlightedIndex(val => val !== null ? INDEX_COMPUTE : null)}
              ref={refCompute}
            >
              <Text>
                Compute
              </Text>
            </Button>

            <FlyoutMenu
              items={computeItems}
              onClickCallback={() => setHighlightedIndex(null)}
              open={highlightedIndex === INDEX_COMPUTE}
              parentRef={refCompute}
              uuid="FileHeaderMenu/viewItems"
            />
          </div>
        )}

        {children}
      </FlexContainer>
    </ClickOutside>
  );
}

export default FileHeaderMenu;
