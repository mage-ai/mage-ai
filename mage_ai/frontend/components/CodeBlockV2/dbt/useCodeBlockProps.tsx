import * as osPath from 'path';

import BlockType, { BlockTypeEnum, BlockLanguageEnum, StatusTypeEnum } from '@interfaces/BlockType';
import Circle from '@oracle/elements/Circle';
import Configuration from './Configuration';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import Lineage from './Lineage';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { AddonBlockTypeEnum } from '@interfaces/AddonBlockOptionType';
import {
  Alphabet,
  BatchSquaresStacked,
  BlocksCombined,
  Callback,
  Charts,
  Chat,
  ChevronDown,
  ChevronUp,
  Close,
  Conditional,
  DocumentIcon,
  Edit,
  Filter,
  Interactions,
  LayoutSplit,
  LayoutStacked,
  Monitor,
  PlayButtonFilled,
  PowerUps,
  SettingsWithKnobs,
  Trash,
  TreeWithArrowsDown,
  TreeWithArrowsUp,
  VisibleEye,
} from '@oracle/icons';
import { ButtonUUIDEnum, UseCodeBlockPropsReturnType, UseCodeBlockPropsType } from '../constants';
import { HeaderTabEnum, buildHeaderTabs, buildOutputTabs } from './constants';
import { ICON_SIZE, MENU_ICON_SIZE } from '../Header/index.style';
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
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { validate } from './utils';
import { executeCode } from '@components/CodeEditor/keyboard_shortcuts/shortcuts';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { removeFileExtension } from '@utils/files';

const MENU_ICON_PROPS = {
  default: true,
  size: MENU_ICON_SIZE,
};

export default function useCodeBlockProps({
  addNewBlock,
  allowCodeBlockShortcuts,
  block,
  codeCollapsed,
  dbtConfigurationOptions,
  deleteBlock,
  disableShortcuts,
  executionState,
  hideRunButton,
  interruptKernel,
  openSidekickView,
  outputCollapsed,
  pipeline,
  runBlockAndTrack,
  savePipelineContent,
  scrollTogether,
  setCodeCollapsed,
  setErrors,
  setHiddenBlocks,
  setOutputCollapsed,
  setScrollTogether,
  setSideBySideEnabled,
  sideBySideEnabled,
  theme,
  updatePipeline,
}: UseCodeBlockPropsType): UseCodeBlockPropsReturnType {
  const { color: blockColor, configuration, replicated_block: replicatedBlock, type, uuid } = block;
  const { dynamic, reduce_output: reduceOutput } = configuration || {};

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
  let subtitle = null;
  const filePath = configuration?.file_path || configuration?.file_source?.path;
  if (filePath && removeFileExtension(filePath) !== title) {
    subtitle = filePath;
  }

  function validateBeforeAction(
    { setSelectedHeaderTab } = {
      setSelectedHeaderTab: null,
    },
  ) {
    const errors = validate(block);
    if (errors) {
      if (setSelectedHeaderTab) {
        errors.links = [
          {
            closeAfterClick: true,
            label: 'Continue dbt configuration',
            onClick: () =>
              setSelectedHeaderTab?.(
                headerTabs?.find(tab => HeaderTabEnum.CONFIGURATION === tab.uuid),
              ),
          },
        ];
      }

      setErrors(errors);

      return false;
    }

    return true;
  }

  const headerTabs = buildHeaderTabs({
    block,
  });

  const outputTabs = buildOutputTabs({ block });

  const shortcutsEnabled = allowCodeBlockShortcuts || !disableShortcuts;

  const buttonExecute = {
    color: color?.accent,
    description: (
      <FlexContainer alignItems="center">
        <KeyboardTextGroup
          addPlusSignBetweenKeys
          keyTextGroups={[[KEY_SYMBOL_META, KEY_SYMBOL_ENTER]]}
        />

        <Spacing mr={1} />

        <Text muted>Compile SQL and excute query for sample data.</Text>
      </FlexContainer>
    ),
    disabled: ({ active }) => active,
    icon: <PlayButtonFilled size={ICON_SIZE} />,
    keyTextsPosition: KeyTextsPostitionEnum.LEFT,
    keyboardShortcutValidation: !shortcutsEnabled
      ? null
      : ({ keyHistory, keyMapping }, index: number, { selected }) =>
          selected &&
          (onlyKeysPresent([KEY_CODE_META, KEY_CODE_ENTER], keyMapping) ||
            onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_ENTER], keyMapping)),
    label: () => 'Preview',
    onClick: opts => {
      if (validateBeforeAction(opts)) {
        runBlockAndTrack({
          block,
        });
      }
    },
    uuid: ButtonUUIDEnum.EXECUTE,
  };

  const buttonExecuteCancel = {
    color: color?.accent,
    description: (
      <FlexContainer alignItems="center">
        <KeyboardTextGroup
          addPlusSignBetweenKeys
          keyTextGroups={[[KEY_SYMBOL_I], [KEY_SYMBOL_I]]}
        />

        <Spacing mr={1} />

        <Text muted>Interrupt kernel and cancel execution</Text>
      </FlexContainer>
    ),
    icon: (
      <Circle borderOnly danger size={ICON_SIZE * 1.5}>
        <Close danger size={ICON_SIZE * 0.75} />
      </Circle>
    ),
    keyTextsPosition: KeyTextsPostitionEnum.RIGHT,
    keyboardShortcutValidation: !shortcutsEnabled
      ? null
      : ({ keyHistory }, index: number, { selected }) =>
          selected && keyHistory[0] === KEY_CODE_I && keyHistory[1] === KEY_CODE_I,
    onClick: interruptKernel,
    uuid: ButtonUUIDEnum.EXECUTE_CANCEL,
    visible: ({ active }) => active,
  };

  const buttonRun = {
    Icon: Callback,
    description: 'Run model',
    disabled: ({ active }) => active,
    label: () => 'Run',
    onClick: opts => {
      if (validateBeforeAction(opts)) {
        runBlockAndTrack({
          block,
          runSettings: {
            run_model: true,
          },
        });
      }
    },
    uuid: ButtonUUIDEnum.RUN,
  };

  const buttonTest = {
    Icon: Monitor,
    description: 'Test model',
    disabled: ({ active }) => active,
    label: () => 'Test',
    onClick: opts => {
      if (validateBeforeAction(opts)) {
        runBlockAndTrack({
          block,
          runSettings: {
            test_model: true,
          },
        });
      }
    },
    uuid: ButtonUUIDEnum.TEST,
  };

  const buttonBuild = {
    Icon: BlocksCombined,
    description: 'Build model',
    disabled: ({ active }) => active,
    label: () => 'Build',
    onClick: opts => {
      if (validateBeforeAction(opts)) {
        runBlockAndTrack({
          block,
          runSettings: {
            build_model: true,
          },
        });
      }
    },
    uuid: ButtonUUIDEnum.BUILD,
  };

  const menuGroups = [
    {
      uuid: 'Execute',
      items: [
        {
          beforeIcon: <TreeWithArrowsUp {...MENU_ICON_PROPS} />,
          uuid: 'Run all upstream blocks then execute',
          onClick: opts => {
            if (validateBeforeAction(opts)) {
              runBlockAndTrack({
                block,
                runUpstream: true,
              });
            }
          },
        },
        {
          beforeIcon: <TreeWithArrowsUp {...MENU_ICON_PROPS} />,
          uuid: 'Run incomplete upstream blocks then execute',
          onClick: opts => {
            if (validateBeforeAction(opts)) {
              runBlockAndTrack({
                block,
                runIncompleteUpstream: true,
              });
            }
          },
        },
        {
          beforeIcon: <TreeWithArrowsDown {...MENU_ICON_PROPS} />,
          uuid: 'Execute then run downstream blocks',
          onClick: opts => {
            if (validateBeforeAction(opts)) {
              runBlockAndTrack({
                block,
                runDownstream: true,
              });
            }
          },
        },
        {
          beforeIcon: <Monitor {...MENU_ICON_PROPS} />,
          label: () => (
            <Text>
              Run{' '}
              <Text color={color?.accent} inline monospace>
                @tests
              </Text>{' '}
              defined in block
            </Text>
          ),
          leftAligned: true,
          uuid: 'Run @tests defined in block',
          onClick: opts => {
            if (validateBeforeAction(opts)) {
              runBlockAndTrack({
                block,
                runTests: true,
              });
            }
          },
        },
      ],
    },
    {
      uuid: 'Enhance',
      items: [
        {
          isGroupingTitle: true,
          uuid: 'Dynamic',
        },
        {
          beforeIcon: <TreeWithArrowsDown success={dynamic} {...MENU_ICON_PROPS} />,
          disabled: dynamic,
          uuid: 'Set block as dynamic',
          onClick: () =>
            savePipelineContent({
              block: {
                ...block,
                configuration: {
                  ...configuration,
                  dynamic: true,
                },
              },
            }),
        },
        {
          beforeIcon: <Close disabled={!dynamic} {...MENU_ICON_PROPS} />,
          disabled: !dynamic,
          uuid: 'Disable block as dynamic',
          onClick: () =>
            savePipelineContent({
              block: {
                ...block,
                configuration: {
                  ...configuration,
                  dynamic: false,
                },
              },
            }),
        },
        {
          beforeIcon: <Filter success={reduceOutput} {...MENU_ICON_PROPS} />,
          uuid: 'Reduce output',
          disabled: reduceOutput,
          onClick: () =>
            savePipelineContent({
              block: {
                ...block,
                configuration: {
                  ...configuration,
                  reduce_output: true,
                },
              },
            }),
        },
        {
          beforeIcon: <Close disabled={!reduceOutput} {...MENU_ICON_PROPS} />,
          uuid: 'Don’t reduce output',
          disabled: !reduceOutput,
          onClick: () =>
            savePipelineContent({
              block: {
                ...block,
                configuration: {
                  ...configuration,
                  reduce_output: false,
                },
              },
            }),
        },
      ],
    },
    {
      uuid: 'Blocks',
      items: [
        {
          beforeIcon: <TreeWithArrowsUp {...MENU_ICON_PROPS} />,
          uuid: 'Add upstream models',
          tooltip: () => 'Add upstream models for this model to the pipeline.',
          onClick: () =>
            updatePipeline({
              pipeline: {
                add_upstream_for_block_uuid: uuid,
              },
            }),
        },
        {
          beforeIcon: <Conditional {...MENU_ICON_PROPS} />,
          uuid: 'Add conditional',
          onClick: () =>
            openSidekickView(ViewKeyEnum.ADDON_BLOCKS, true, {
              addon: AddonBlockTypeEnum.CONDITIONAL,
              blockUUID: block?.uuid,
            }),
        },
        {
          beforeIcon: <Callback {...MENU_ICON_PROPS} />,
          uuid: 'Add callback',
          onClick: () =>
            openSidekickView(ViewKeyEnum.ADDON_BLOCKS, true, {
              addon: AddonBlockTypeEnum.CALLBACK,
              blockUUID: block?.uuid,
            }),
        },
        {
          beforeIcon: <PowerUps {...MENU_ICON_PROPS} />,
          uuid: 'Add power up',
          onClick: () => openSidekickView(ViewKeyEnum.EXTENSIONS, true),
        },
        {
          beforeIcon: <Interactions {...MENU_ICON_PROPS} />,
          uuid: 'Add/Edit interactions',
          onClick: () => openSidekickView(ViewKeyEnum.INTERACTIONS, true),
        },
        {
          beforeIcon: <Charts {...MENU_ICON_PROPS} />,
          uuid: 'Add charts',
          onClick: () => openSidekickView(ViewKeyEnum.CHARTS, true),
        },
      ],
    },
    {
      uuid: 'Edit',
      items: [
        {
          beforeIcon: <Alphabet {...MENU_ICON_PROPS} />,
          uuid: 'Change name',
          onClick: () => openSidekickView(ViewKeyEnum.BLOCK_SETTINGS, true),
        },
        {
          beforeIcon: <Edit {...MENU_ICON_PROPS} />,
          uuid: 'Change color',
          onClick: () => openSidekickView(ViewKeyEnum.BLOCK_SETTINGS, true),
        },
        {
          beforeIcon: <SettingsWithKnobs {...MENU_ICON_PROPS} />,
          uuid: 'All settings',
          onClick: () => openSidekickView(ViewKeyEnum.BLOCK_SETTINGS, true),
        },
        {
          beforeIcon: <BatchSquaresStacked disabled={!!replicatedBlock} {...MENU_ICON_PROPS} />,
          uuid: 'Replicate block',
          disabled: !!replicatedBlock,
          onClick: () =>
            addNewBlock({
              replicated_block: uuid,
            }),
        },
        {
          beforeIcon: <Trash {...MENU_ICON_PROPS} />,
          uuid: 'Delete block',
          onClick: () => {
            deleteBlock(block);
          },
        },
      ],
    },
    {
      uuid: 'View',
      items: [
        {
          beforeIcon: <VisibleEye {...MENU_ICON_PROPS} />,
          uuid: 'Hide block',
          onClick: () => {
            // @ts-ignore
            setHiddenBlocks(prev => ({
              ...prev,
              [uuid]: block,
            }));
          },
        },
        {
          disabled: codeCollapsed,
          beforeIcon: <ChevronUp disabled={codeCollapsed} {...MENU_ICON_PROPS} />,
          uuid: 'Collapse code',
          onClick: () => setCodeCollapsed(true),
        },
        {
          disabled: !codeCollapsed,
          beforeIcon: <ChevronDown disabled={!codeCollapsed} {...MENU_ICON_PROPS} />,
          uuid: 'Expand code',
          onClick: () => setCodeCollapsed(false),
        },
        {
          disabled: outputCollapsed,
          beforeIcon: <ChevronUp disabled={outputCollapsed} {...MENU_ICON_PROPS} />,
          uuid: 'Collapse output',
          onClick: () => setOutputCollapsed(true),
        },
        {
          disabled: !outputCollapsed,
          beforeIcon: <ChevronDown disabled={!outputCollapsed} {...MENU_ICON_PROPS} />,
          uuid: 'Expand output',
          onClick: () => setOutputCollapsed(false),
        },
        {
          isGroupingTitle: true,
          uuid: 'Split view',
        },
        {
          disabled: !sideBySideEnabled,
          beforeIcon: <LayoutStacked disabled={!sideBySideEnabled} {...MENU_ICON_PROPS} />,
          uuid: 'Show output below block',
          onClick: () => setSideBySideEnabled(false),
        },
        {
          disabled: sideBySideEnabled,
          beforeIcon: (
            <LayoutSplit
              disabled={sideBySideEnabled}
              success={sideBySideEnabled}
              {...MENU_ICON_PROPS}
            />
          ),
          uuid: 'Show output next to code (beta)',
          onClick: () => setSideBySideEnabled(true),
        },
        {
          disabled: !sideBySideEnabled || scrollTogether,
          beforeIcon: (
            <LayoutSplit
              disabled={!sideBySideEnabled || scrollTogether}
              success={scrollTogether}
              {...MENU_ICON_PROPS}
            />
          ),
          uuid: 'Scroll output alongside code (beta)',
          onClick: () => setScrollTogether(true),
        },
      ],
    },
    {
      uuid: 'Support',
      items: [
        {
          beforeIcon: <Chat {...MENU_ICON_PROPS} />,
          uuid: 'Live chat 24/7',
          linkProps: {
            href: 'https://mage.ai/chat',
            openNewWindow: true,
          },
        },
        {
          beforeIcon: <DocumentIcon {...MENU_ICON_PROPS} />,
          uuid: 'Developer documentation',
          linkProps: {
            href: 'https://docs.mage.ai',
            openNewWindow: true,
          },
        },
      ],
    },
  ];

  const menuGroupsOutput = [
    {
      uuid: 'Explore data',
      items: [
        {
          beforeIcon: <DocumentIcon {...MENU_ICON_PROPS} />,
          uuid: 'Play with data in a scratchpad',
          onClick: () =>
            addNewBlock({
              content: `"""
NOTE: Scratchpad blocks are used only for experimentation and testing out code.
The code written here will not be executed as part of the pipeline.
"""
from mage_ai.data_preparation.variable_manager import get_variable


df = get_variable('${pipeline.uuid}', '${block.uuid}', 'output_0')
`,
              language: BlockLanguageEnum.PYTHON,
              type: BlockTypeEnum.SCRATCHPAD,
            }),
        },
        {
          beforeIcon: <Charts {...MENU_ICON_PROPS} />,
          uuid: 'Visualize output data',
          onClick: () => openSidekickView(ViewKeyEnum.CHARTS, true),
        },
      ],
    },
    // {
    //   uuid: 'Debug logs',
    //   items: [
    //     {
    //       beforeIcon: <Save {...MENU_ICON_PROPS} />,
    //       uuid: 'Download logs',
    //     },
    //     {
    //       beforeIcon: <Copy {...MENU_ICON_PROPS} />,
    //       uuid: 'Copy all logs to clipboard',
    //     },
    //     {
    //       beforeIcon: <AlertTriangle {...MENU_ICON_PROPS} />,
    //       uuid: 'Copy errors to clipboard',
    //     },
    //   ],
    // },
  ];

  const headerTabContent = {
    renderTabContent: (tab: TabType, defaultContent: any) => {
      if (HeaderTabEnum.CONFIGURATION === tab?.uuid) {
        return (
          <Configuration
            block={block}
            dbtConfigurationOptions={dbtConfigurationOptions}
            pipeline={pipeline}
            savePipelineContent={savePipelineContent}
          />
        );
        // } else if (HeaderTabEnum.OVERVIEW === tab?.uuid) {
        //   return;
      } else if (HeaderTabEnum.LINEAGE === tab?.uuid) {
        return <Lineage block={block} />;
      }

      return defaultContent;
    },
  };

  return {
    editor: {
      shortcuts:
        hideRunButton && shortcutsEnabled
          ? []
          : [
              (monaco, editor) =>
                executeCode(monaco, () => {
                  if (validateBeforeAction()) {
                    runBlockAndTrack({
                      /*
                       * This block doesn't get updated when the upstream dependencies change,
                       * so we need to update the shortcuts in the CodeEditor component.
                       */
                      block,
                      code: editor.getValue(),
                    });
                  }
                }),
            ],
    },
    header: {
      buttons: [buttonExecute, buttonRun, buttonTest, buttonBuild, buttonExecuteCancel],
      menuGroups,
      subheaderVisibleDefault: (b: BlockType) => {
        if (!b?.status || StatusTypeEnum.NOT_EXECUTED === b?.status) {
          return true;
        }

        if (validate(b)) {
          return true;
        }
      },
      subtitle,
      tabs: headerTabs,
      title,
    },
    headerTabContent,
    output: {
      menuGroups: menuGroupsOutput,
      tabs: outputTabs,
    },
  };
}
