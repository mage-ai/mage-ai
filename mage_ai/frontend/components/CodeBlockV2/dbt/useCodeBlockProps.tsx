import * as osPath from 'path';

import Circle from '@oracle/elements/Circle';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import {
  AISparkle,
  BlocksCombined,
  Callback,
  Monitor,
  PauseV2,
  PlayButtonFilled,
  TreeWithArrowsUp,
} from '@oracle/icons';
import { ButtonUUIDEnum, UseCodeBlockComponentType, UseCodeBlockPropsType } from '../constants';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import { ICON_SIZE } from '../Header/index.style';
import {
  KEY_CODE_CONTROL,
  KEY_CODE_ENTER,
  KEY_CODE_I,
  KEY_CODE_META,
  KEY_SYMBOL_ENTER,
  KEY_SYMBOL_I,
  KEY_SYMBOL_META,
} from '@utils/hooks/keyboardShortcuts/constants';
import { KeyTextsPostitionEnum } from '@oracle/elements/Button/KeyboardShortcutButton';
import { UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';

export default function useCodeBlockProps({
  block,
  executionState,
  interruptKernel,
  runBlockAndTrack,
  theme,
}: UseCodeBlockPropsType) {
  const {
    color: blockColor,
    configuration,
    type,
    uuid,
  } = block;

  const color = getColorsForBlockType(type, {
    blockColor,
    theme,
  });

  const projectPath = configuration?.file_source?.project_path;
  let title = uuid;
  if (projectPath) {
    title = title?.replace(projectPath, '');
    if (title?.startsWith(osPath.sep)) {
      title = title?.slice(1);
    }
  }
  const subtitle = configuration?.file_path || configuration?.file_source?.path;

  const buttonExecute = {
    color: color?.accent,
    description: (
      <FlexContainer alignItems="center">
        <KeyboardTextGroup
          addPlusSignBetweenKeys
          keyTextGroups={[[KEY_SYMBOL_META, KEY_SYMBOL_ENTER]]}
        />

        <Spacing mr={1} />

        <Text muted>
          Compile and preview
        </Text>
      </FlexContainer>
    ),
    disabled: ({ active }) => active,
    icon: <PlayButtonFilled size={ICON_SIZE} />,
    keyTextsPosition: KeyTextsPostitionEnum.LEFT,
    keyboardShortcutValidation: ({
      keyHistory,
      keyMapping,
    }, index: number, {
      selected,
    }) => selected && (
      onlyKeysPresent([KEY_CODE_META, KEY_CODE_ENTER], keyMapping)
        || onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_ENTER], keyMapping)
    ),
    label: () => 'Compile & preview',
    onClick: () => {
      runBlockAndTrack({
        block,
      });
    },
    uuid: ButtonUUIDEnum.EXECUTE,
  };

  const buttonExecuteCancel = {
    color: color?.accent,
    description: (
      <FlexContainer alignItems="center">
        <KeyboardTextGroup
          addSpaceBetweenKeys
          keyTextGroups={[[KEY_SYMBOL_I], [KEY_SYMBOL_I]]}
        />

        <Spacing mr={1} />

        <Text muted>
          Interrupt kernel and cancel execution
        </Text>
      </FlexContainer>
    ),
    icon: (
      <PauseV2
        active
        size={ICON_SIZE}
      />
    ),
    keyTextsPosition: KeyTextsPostitionEnum.RIGHT,
    keyboardShortcutValidation: ({
      keyHistory,
    }, index: number, {
      selected,
    }) => selected && keyHistory[0] === KEY_CODE_I && keyHistory[1] === KEY_CODE_I,
    onClick: interruptKernel,
    uuid: ButtonUUIDEnum.EXECUTE_CANCEL,
    visible: ({ active }) => active,
  };

  const buttonRun = {
    Icon: Callback,
    description: 'Run model',
    disabled: ({ active }) => active,
    label: () => 'Run',
    onClick: () => {
      runBlockAndTrack({
        block,
        runSettings: {
          run_model: true,
        },
      });
    },
    uuid: ButtonUUIDEnum.RUN,
  };
  const buttonTest = {
    Icon: Monitor,
    description: 'Test model',
    disabled: ({ active }) => active,
    label: () => 'Test',
    onClick: () => {
      runBlockAndTrack({
        block,
        test_model: true,
      });
    },
    uuid: ButtonUUIDEnum.TEST,
  };
  const buttonBuild = {
    Icon: BlocksCombined,
    description: 'Build model',
    disabled: ({ active }) => active,
    label: () => 'Build',
    onClick: () => {
      runBlockAndTrack({
        block,
        build_model: true,
      });
    },
    uuid: ButtonUUIDEnum.BUILD,
  };

  const buttonRunUpstream = {
    Icon: TreeWithArrowsUp,
    color: color?.accent,
    description: 'Execute and run all upstream blocks',
    disabled: ({ active }) => active,
    onClick: () => {
      runBlockAndTrack({
        block,
        runUpstream: true,
      });
    },
    uuid: ButtonUUIDEnum.RUN_UPSTREAM,
  };

  const menuGroups = [
    {
      uuid: 'Augment',
      items: [
        {
          uuid: 'Set block as dynamic',
        },
        {
          uuid: 'Disable block as dynamic',
        },
        {
          uuid: 'Reduce output',
        },
        {
          uuid: 'Don’t reduce output',
        },
        {
          uuid: 'Replicate block',
        },
      ],
    },
    {
      uuid: 'Blocks',
      items: [
        {
          uuid: 'Add upstream block',
        },
        {
          uuid: 'Add downstream block',
        },
        {
          uuid: 'Add conditional',
        },
        {
          uuid: 'Add callback',
        },
        {
          uuid: 'Add power up',
        },
        {
          uuid: 'Add/Edit interactions',
        },
      ],
    },
    {
      uuid: 'Edit',
      items: [
        {
          uuid: 'Change name',
        },
        {
          uuid: 'Change color',
        },
        {
          uuid: 'All settings',
        },
        {
          uuid: 'Delete block',
        },
      ],
    },
    {
      uuid: 'View',
      items: [
        {
          uuid: 'Hide block',
        },
        {
          isGroupingTitle: true,
          uuid: 'Collapse / Expand',
        },
        {
          uuid: 'Collapse code',
        },
        {
          uuid: 'Expand code',
        },
        {
          uuid: 'Collapse output',
        },
        {
          uuid: 'Expand output',
        },
        {
          isGroupingTitle: true,
          uuid: 'Split view',
        },
        {
          uuid: 'Show output below block',
        },
        {
          uuid: 'Show output next to code (beta)',
        },
        {
          uuid: 'Scroll output alongside code (beta)',
        },
      ],
    },
    {
      uuid: 'Artifacts',
      items: [
        {
          isGroupingTitle: true,
          uuid: 'Document code',
        },
        {
          uuid: 'Add code comments',
        },
        {
          uuid: 'Add documentation with markdown blocks',
        },
        {
          isGroupingTitle: true,
          uuid: 'Visualize code',
        },
        {
          uuid: 'Add a chart',
        },
      ],
    },
    {
      uuid: 'Help',
      items: [
        {
          uuid: 'Live chat 24/7',
          linkProps: {
            href: 'https://mage.ai/chat',
            openNewWindow: true,
          },
        },
        {
          uuid: 'Developer documentation',
          linkProps: {
            href: 'https://docs.mage.ai',
            openNewWindow: true,
          },
        },
      ],
    },
  ];

  return {
    editor: {

    },
    header: {
      buttons: [
        buttonExecute,
        buttonRunUpstream,
        buttonRun,
        buttonTest,
        buttonBuild,
        buttonExecuteCancel,
      ],
      menuGroups,
      subtitle,
      title,
    },
  };
}
