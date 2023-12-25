import * as osPath from 'path';
import { useCallback } from 'react';

import BlockType, { StatusTypeEnum } from '@interfaces/BlockType';
import CacheItemType, { CacheItemTypeEnum } from '@interfaces/CacheItemType';
import Circle from '@oracle/elements/Circle';
import Configuration from './Configuration';
import DependencyGraph from '@components/DependencyGraph';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import api from '@api';
import { AddonBlockTypeEnum } from '@interfaces/AddonBlockOptionType';
import {
  AISparkle,
  Alphabet,
  BatchPipeline,
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
  PauseV2,
  PlayButtonFilled,
  PowerUps,
  SettingsWithKnobs,
  Trash,
  TreeWithArrowsDown,
  TreeWithArrowsUp,
  VisibleEye,
} from '@oracle/icons';
import { ButtonUUIDEnum, UseCodeBlockComponentType, UseCodeBlockPropsType } from '../constants';
import { CONFIG_KEY_DBT_PROJECT_NAME } from '@interfaces/ChartBlockType';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import { HeaderTabEnum, buildHeaderTabs } from './constants';
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
import { UNIT } from '@oracle/styles/units/spacing';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { validate } from './utils';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';

const MENU_ICON_PROPS = {
  default: true,
  size: MENU_ICON_SIZE,
};

export default function useCodeBlockProps({
  block,
  codeCollapsed,
  deleteBlock,
  executionState,
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
}: UseCodeBlockPropsType): UseCodeBlockComponentType {
  const {
    color: blockColor,
    configuration,
    replicated_block: replicatedBlock,
    type,
    uuid,
  } = block;
  const {
    dynamic,
    reduce_output: reduceOutput,
  } = configuration || {};

  const filePath = configuration?.file_path || configuration?.file_source?.path;
  const requestQuery = {
    item_type: CacheItemTypeEnum.DBT,
    project_path: configuration?.[CONFIG_KEY_DBT_PROJECT_NAME],
  };
  const { data: dataDetail } = api.cache_items.detail(encodeURIComponent(filePath), requestQuery, {
    pauseFetch: !configuration?.[CONFIG_KEY_DBT_PROJECT_NAME],
  });
  const itemDetail: CacheItemType = dataDetail?.cache_item;

  const upstreamBlocks: BlockType[] = itemDetail?.item?.upstream_blocks || [];

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

  function validateBeforeAction({
    setSelectedHeaderTab,
  }) {
    const errors = validate(block);
    if (errors) {
      errors.links = [
        {
          closeAfterClick: true,
          label: 'Continue dbt configuration',
          onClick: () => setSelectedHeaderTab?.(headerTabs?.find((
            tab,
          ) => HeaderTabEnum.CONFIGURATION === tab.uuid)),
        },
      ];
      setErrors(errors);

      return false;
    }

    return true;
  };

  const headerTabs = buildHeaderTabs({
    block,
  });

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
          Compile SQL and excute query for sample data.
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
    onClick: (opts) => {
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
    onClick: (opts) => {
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
    onClick: (opts) => {
      if (validateBeforeAction(opts)) {
        runBlockAndTrack({
          block,
          test_model: true,
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
    onClick: (opts) => {
      if (validateBeforeAction(opts)) {
        runBlockAndTrack({
          block,
          build_model: true,
        });
      }
    },
    uuid: ButtonUUIDEnum.BUILD,
  };

  const buttonRunUpstream = {
    Icon: TreeWithArrowsUp,
    description: 'Execute and run all upstream blocks',
    disabled: ({ active }) => active,
    label: () => 'Run upstream',
    onClick: (opts) => {
      if (validateBeforeAction(opts)) {
        runBlockAndTrack({
          block,
          runUpstream: true,
        });
      }
    },
    uuid: ButtonUUIDEnum.RUN_UPSTREAM,
  };

  const menuGroups = [
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
          onClick: () => savePipelineContent({
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
          onClick: () => savePipelineContent({
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
          onClick: () => savePipelineContent({
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
          onClick: () => savePipelineContent({
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
          onClick: () => updatePipeline({
            pipeline: {
              add_upstream_for_block_uuid: uuid,
            },
          }),
        },
        {
          beforeIcon: <Conditional {...MENU_ICON_PROPS} />,
          uuid: 'Add conditional',
          onClick: () => openSidekickView(ViewKeyEnum.ADDON_BLOCKS, true, {
            addon: AddonBlockTypeEnum.CONDITIONAL,
          }),
        },
        {
          beforeIcon: <Callback {...MENU_ICON_PROPS} />,
          uuid: 'Add callback',
          onClick: () => openSidekickView(ViewKeyEnum.ADDON_BLOCKS, true, {
            addon: AddonBlockTypeEnum.CALLBACK,
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
          onClick: () => addNewBlock({
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
          beforeIcon: <LayoutSplit success={sideBySideEnabled} disabled={sideBySideEnabled} {...MENU_ICON_PROPS} />,
          uuid: 'Show output next to code (beta)',
          onClick: () => setSideBySideEnabled(true),
        },
        {
          disabled: !sideBySideEnabled || scrollTogether,
          beforeIcon: <LayoutSplit success={scrollTogether} disabled={!sideBySideEnabled || scrollTogether} {...MENU_ICON_PROPS} />,
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

  const headerTabContent = {
    renderTab: (tab: TabType, defaultContent: any) => {
      if (HeaderTabEnum.CONFIGURATION === tab?.uuid) {
        return (
          <Configuration
            block={block}
            pipeline={pipeline}
            savePipelineContent={savePipelineContent}
          />
        );
      // } else if (HeaderTabEnum.OVERVIEW === tab?.uuid) {
      //   return;
      } else if (HeaderTabEnum.LINEAGE === tab?.uuid) {
        console.log(block);
        return upstreamBlocks?.length >= 1 && (
          <DependencyGraph
            disabled
            enablePorts={false}
            height={UNIT * 80}
            pannable
            pipeline={{
              blocks: upstreamBlocks,
              uuid: null,
            }}
            zoomable
          />
        );
      }

      return defaultContent;
    },
  };

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
      subheaderVisibleDefault: (b: BlockType) => {
        if (!status || StatusTypeEnum.NOT_EXECUTED === status) {
          return true;
        }

        if (validate(b)) {
          return True
        }
      },
      subtitle,
      tabs: headerTabs,
      title,
    },
    headerTabContent,
  };
}
