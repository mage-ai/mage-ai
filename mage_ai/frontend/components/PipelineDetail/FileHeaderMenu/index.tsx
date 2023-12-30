import { useEffect, useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import KernelOutputType from '@interfaces/KernelOutputType';
import KernelType, { KernelNameEnum } from '@interfaces/KernelType';
import PipelineType, {
  KERNEL_NAME_TO_PIPELINE_TYPE,
  PipelineTypeEnum,
} from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import useKernel from '@utils/models/kernel/useKernel';
import useProject from '@utils/models/project/useProject';
import {
  Check,
  LayoutSplit,
  LayoutStacked,
} from '@oracle/icons';
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
import { UNIT } from '@oracle/styles/units/spacing';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { isMac } from '@utils/os';
import { randomNameGenerator } from '@utils/string';
import { useKeyboardContext } from '@context/Keyboard';

const NUMBER_OF_TOP_MENU_ITEMS: number = 3;
const ICON_SIZE = 1.5 * UNIT;
const INDEX_COMPUTE = 4;

type FileHeaderMenuProps = {
  cancelPipeline: () => void;
  children?: any;
  createPipeline: (data: any) => void;
  executePipeline: () => void;
  interruptKernel: () => void;
  isPipelineExecuting: boolean;
  pipeline: PipelineType;
  restartKernel: () => void;
  savePipelineContent: () => void;
  scrollTogether?: boolean;
  setActiveSidekickView: (
    newView: ViewKeyEnum,
    pushHistory?: boolean,
  ) => void;
  setMessages: (message: {
    [uuid: string]: KernelOutputType[];
  }) => void;
  sideBySideEnabled?: boolean;
  setScrollTogether?: (prev: any) => void;
  setSideBySideEnabled?: (prev: any) => void;
  updatePipelineMetadata: (name: string, type?: string) => void;
};

function FileHeaderMenu({
  cancelPipeline,
  children,
  createPipeline,
  executePipeline,
  interruptKernel,
  isPipelineExecuting,
  pipeline,
  restartKernel,
  savePipelineContent,
  scrollTogether,
  setActiveSidekickView,
  setMessages,
  setScrollTogether,
  setSideBySideEnabled,
  sideBySideEnabled,
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
      keyTextGroups: [[
        isMac() ? KEY_SYMBOL_META : KEY_SYMBOL_CONTROL,
        KEY_SYMBOL_S,
      ]],
      label: () => 'Save pipeline',
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
        <FlexContainer alignItems="center">
          <LayoutStacked success={!sideBySideEnabled} />

          <Spacing mr={1} />

          <Text noWrapping>
            Show output below block
          </Text>
        </FlexContainer>
      ),
      onClick: () => {
        setSideBySideEnabled(false);
      },
      uuid: 'Show output below block',
    },
    {
      label: () => (
        <FlexContainer alignItems="center">
          <LayoutSplit success={sideBySideEnabled} />

          <Spacing mr={1} />

          <Text noWrapping>
            Show output next to code (beta)
          </Text>
        </FlexContainer>
      ),
      onClick: () => {
        setSideBySideEnabled(true);
      },
      uuid: 'Show output next to code',
    },
    {
      disabled: !sideBySideEnabled,
      label: () => (
        <FlexContainer alignItems="center">
          {scrollTogether ? <Check /> : <div style={{ width: ICON_SIZE}} />}

          <Spacing mr={1} />

          <Text disabled={!sideBySideEnabled} noWrapping>
            Scroll output alongside code (beta)
          </Text>
        </FlexContainer>
      ),
      onClick: () => setScrollTogether(!scrollTogether),
      uuid: 'Scroll output alongside code',
    },
  ], [
    scrollTogether,
    setScrollTogether,
    setSideBySideEnabled,
    sideBySideEnabled,
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
      {
        label: () => 'Open compute management',
        linkProps: {
          href: '/compute',
        },
        uuid: 'Open compute management',
      },
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
          && featureEnabled?.(featureUUIDs.NOTEBOOK_BLOCK_OUTPUT_SPLIT_VIEW)
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
