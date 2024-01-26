import { useContext, useMemo, useRef, useState } from 'react';
import { ThemeContext } from 'styled-components';
import { useMutation } from 'react-query';

import AddChartMenu from './AddChartMenu';
import BlockType, {
  BlockLanguageEnum,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import ClickOutside from '@oracle/components/ClickOutside';
import Convert from '@oracle/icons/custom/Convert';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import LLMType, { LLMUseCaseEnum } from '@interfaces/LLMType';
import Link from '@oracle/elements/Link';
import Panel from '@oracle/components/Panel';
import PipelineType from '@interfaces/PipelineType';
import ProjectType from '@interfaces/ProjectType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import { AddonBlockTypeEnum } from '@interfaces/AddonBlockOptionType';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import {
  AISparkle,
  Charts,
  Check,
  Close,
  Edit,
  Ellipsis,
  PlayButtonFilled,
  SettingsWithKnobs,
} from '@oracle/icons';
import { DEFAULT_ICON_SIZE } from '../constants';
import {
  KEY_SYMBOL_CONTROL,
  KEY_SYMBOL_ENTER,
  KEY_SYMBOL_I,
  KEY_SYMBOL_META,
} from '@utils/hooks/keyboardShortcuts/constants';
import { PADDING_UNITS, UNIT, UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { buildConvertBlockMenuItems, getMoreActionsItems } from '../utils';
import { getColorsForBlockType } from '../index.style';
import { isMac } from '@utils/os';
import { indexBy } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';

export type CommandButtonsSharedProps = {
  addWidget?: (widget: BlockType, opts?: {
    onCreateCallback?: (block: BlockType) => void;
  }) => Promise<any>;
  blocks: BlockType[];
  deleteBlock: (block: BlockType) => void;
  executionState: ExecutionStateEnum;
  interruptKernel: () => void;
};

type CommandButtonsProps = {
  addNewBlock: (block: BlockType) => Promise<any>;
  block: BlockType;
  blockContent?: string;
  fetchFileTree?: () => void;
  fetchPipeline: () => void;
  hideExtraButtons?: boolean;
  isEditingBlock?: boolean;
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean, opts?: {
    addon: AddonBlockTypeEnum,
    blockUUID: string;
  }) => void;
  pipeline?: PipelineType;
  project?: ProjectType;
  runBlock?: (payload: {
    block: BlockType;
    code?: string;
    disableReset?: boolean;
    runDownstream?: boolean;
    runIncompleteUpstream?: boolean;
    runSettings?: {
      run_model?: boolean;
    };
    runUpstream?: boolean;
    runTests?: boolean;
  }) => void;
  savePipelineContent: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
  setBlockContent?: (content: string) => void;
  setIsEditingBlock?: (isEditingBlock: any) => void;
  setOutputCollapsed: (outputCollapsed: boolean) => void;
  setErrors: (errors: ErrorsType) => void;
  showConfigureProjectModal?: (opts: {
    cancelButtonText?: string;
    header?: any;
    onCancel?: () => void;
    onSaveSuccess?: (project: ProjectType) => void;
  }) => void;
} & CommandButtonsSharedProps;

function CommandButtons({
  addNewBlock,
  addWidget,
  block,
  blockContent,
  blocks,
  deleteBlock,
  executionState,
  fetchFileTree,
  fetchPipeline,
  hideExtraButtons,
  interruptKernel,
  isEditingBlock,
  openSidekickView,
  pipeline,
  project,
  runBlock,
  setBlockContent,
  setIsEditingBlock,
  savePipelineContent,
  setErrors,
  setOutputCollapsed,
  showConfigureProjectModal,
}: CommandButtonsProps) {
  const [showError] = useError(null, {}, [], {
    uuid: `CommandButtons/${block?.uuid}`,
  });

  const {
    all_upstream_blocks_executed: upstreamBlocksExecuted = true,
    color: blockColor,
    language,
    metadata,
    type,
    uuid,
  } = block;
  const refAddChart = useRef(null);
  const refConvertBlock = useRef(null);
  const refExecuteActions = useRef(null);
  const refMoreActions = useRef(null);
  const refAIActions = useRef(null);

  const pipelineType = pipeline?.type;

  const [showAddCharts, setShowAddCharts] = useState<boolean>(false);
  const [showConvertMenu, setShowConvertMenu] = useState<boolean>(false);
  const [showExecuteActions, setShowExecuteActions] = useState<boolean>(false);
  const [showMoreActions, setShowMoreActions] = useState<boolean>(false);
  const [showAIActions, setShowAIActions] = useState<boolean>(false);

  const themeContext = useContext(ThemeContext);
  const isInProgress = ExecutionStateEnum.IDLE !== executionState;
  const color = getColorsForBlockType(
    type,
    { blockColor: blockColor, theme: themeContext },
  ).accent;
  const isStreaming = useMemo(() => pipelineType === PipelineTypeEnum.STREAMING, [pipelineType]);
  const isIntegration = useMemo(() => pipelineType === PipelineTypeEnum.INTEGRATION, [pipelineType]);

  const convertBlockMenuItems =
    useMemo(() => buildConvertBlockMenuItems(
      block,
      blocks,
      'CommandButtons',
      addNewBlock,
    ).map((config) => ({
      ...config,
      onClick: () => savePipelineContent().then(() => config.onClick()),
    })),
    [
      addNewBlock,
      block,
      blocks,
      savePipelineContent,
    ]);

  const blocksMapping = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);
  const isDBT = useMemo(() => BlockTypeEnum.DBT === block?.type, [block]);
  const isMarkdown = useMemo(() => BlockTypeEnum.MARKDOWN === block?.type, [block]);

  const [updatePipeline, { isLoading: isLoadingUpdatePipeline }] = useMutation(
    api.pipelines.useUpdate(pipeline?.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipeline();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [createLLM, { isLoading: isLoadingCreateLLM }] = useMutation(
    api.llms.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            llm,
          }) => {
            if (llm?.response && setBlockContent) {
              setBlockContent?.(llm?.response);
            }
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const itemsAIActions = useMemo(() => {
    const shouldShowModal = !project?.openai_api_key;
    const showModal = (llm: LLMType) => {
      showConfigureProjectModal?.({
        header: (
          <Spacing mb={UNITS_BETWEEN_SECTIONS}>
            <Panel>
              <Text warning>
                You need to add an OpenAI API key to your project before you can
                generate blocks using AI.
              </Text>

              <Spacing mt={1}>
                <Text warning>
                  Read <Link
                    href="https://help.openai.com/en/articles/4936850-where-do-i-find-my-secret-api-key"
                    openNewWindow
                  >
                    OpenAI’s documentation
                  </Link> to get your API key.
                </Text>
              </Spacing>
            </Panel>
          </Spacing>
        ),
        onSaveSuccess: (project: ProjectType) => {
          if (project?.openai_api_key) {
            // @ts-ignore
            updatePipeline({
              pipeline: {
                llm,
              },
            });
          }
        },
      });
    };

    const llm: LLMType = {
      request: {
        block_uuid: block?.uuid,
        pipeline_uuid: pipeline?.uuid,
      },
    };

    return [
      {
        label: () => 'Document block (beta)',
        onClick: () => {
          llm.use_case = LLMUseCaseEnum.GENERATE_DOC_FOR_BLOCK;

          if (shouldShowModal) {
            showModal(llm);
          } else {
            // @ts-ignore
            updatePipeline({
              pipeline: {
                llm,
              },
            });
          }
        },
        uuid: 'Document block',
      },
      {
        label: () => 'Document pipeline and all blocks (beta)',
        onClick: () => {
          llm.use_case = LLMUseCaseEnum.GENERATE_DOC_FOR_PIPELINE;

          if (shouldShowModal) {
            showModal(llm);
          } else {
            // @ts-ignore
            updatePipeline({
              pipeline: {
                llm,
              },
            });
          }
        },
        uuid: 'Document pipeline and all blocks',
      },
      {
        label: () => 'Add comments in code (beta)',
        onClick: () => {
          if (shouldShowModal) {
            showModal(llm);
          } else {
            // @ts-ignore
            createLLM({
              llm: {
                request: {
                  block_code: blockContent,
                },
                use_case: LLMUseCaseEnum.GENERATE_COMMENT_FOR_CODE,
              },
            });
          }
        },
        uuid: 'Add comments in code',
      },
    ];
  }, [
    block,
    blockContent,
    createLLM,
    pipeline,
    project,
    showConfigureProjectModal,
    updatePipeline,
  ]);

  return (
    <FlexContainer
      alignItems="center"
    >
      {ExecutionStateEnum.QUEUED === executionState && (
        <Spinner
          color={(themeContext || dark).content.active}
          type="cylon"
        />
      )}
      {ExecutionStateEnum.BUSY === executionState && (
        <Spinner
          color={(themeContext || dark).content.active}
        />
      )}

      {runBlock && (!isInProgress && !isStreaming) &&  (
        <>
          {!isDBT && (
            <Tooltip
              appearBefore
              default
              label={(
                <Text>
                  Run block
                  &nbsp;
                  &nbsp;
                  <KeyboardTextGroup
                    inline
                    keyTextGroups={[[
                      isMac() ? KEY_SYMBOL_META : KEY_SYMBOL_CONTROL,
                      KEY_SYMBOL_ENTER,
                    ]]}
                    monospace
                    uuidForKey={uuid}
                  />
                </Text>
              )}
              size={UNIT * 3}
              widthFitContent
            >
              <Button
                noBackground
                noBorder
                noPadding
                onClick={() => {
                  if (upstreamBlocksExecuted) {
                    runBlock({ block });
                  } else {
                    setShowExecuteActions(true);
                  }
                }}
              >
                <Circle
                  color={color}
                  size={UNIT * 3}
                >
                  <PlayButtonFilled
                    black
                    size={UNIT * 1.5}
                  />
                </Circle>
              </Button>
            </Tooltip>
          )}
          {isDBT && (
            <Button
              backgroundColor={color}
              beforeIcon={<PlayButtonFilled size={UNIT * 1.5} />}
              compact
              onClick={() => {
                if (upstreamBlocksExecuted) {
                  runBlock({ block });
                } else {
                  setShowExecuteActions(true);
                }
              }}
              small
            >
              {(language === BlockLanguageEnum.YAML
                ? 'Run command'
                : 'Compile & preview'
              )}
            </Button>
          )}
          <ClickOutside
            disableEscape
            onClickOutside={() => setShowExecuteActions(false)}
            open={showExecuteActions}
          >
            <FlyoutMenu
              items={
                [
                  {
                    label: () => 'Execute block',
                    onClick: () => runBlock({ block }),
                    uuid: 'execute_block',
                  },
                  {
                    label: () => 'Execute with upstream blocks',
                    onClick: () => runBlock({ block, runUpstream: true }),
                    uuid: 'execute_upstream',
                  },
                ]
              }
              onClickCallback={() => setShowExecuteActions(false)}
              open={showExecuteActions}
              parentRef={refExecuteActions}
              rightOffset={UNIT * 13.25}
              topOffset={UNIT * 4.5}
              uuid="execute_actions"
              width={UNIT * 25}
            />
          </ClickOutside>
        </>
      )}

      {isInProgress && (
        <Spacing ml={PADDING_UNITS}>
          <Tooltip
            appearBefore
            default
            label={(
              <Text>
                Interrupt kernel
                &nbsp;
                &nbsp;
                <KeyboardTextGroup
                  inline
                  keyTextGroups={[[KEY_SYMBOL_I], [KEY_SYMBOL_I]]}
                  monospace
                  uuidForKey={uuid}
                />
              </Text>
            )}
            size={DEFAULT_ICON_SIZE}
            widthFitContent
          >
            <Button
              noBackground
              noBorder
              noPadding
              onClick={() => interruptKernel()}
            >
              <Circle
                borderSize={1.5}
                size={DEFAULT_ICON_SIZE}
              >
                <Close size={UNIT * 1} />
              </Circle>
            </Button>
          </Tooltip>
        </Spacing>
      )}

      {!hideExtraButtons && (BlockTypeEnum.SCRATCHPAD === block.type && !isStreaming) && (
        <Spacing ml={PADDING_UNITS}>
          <FlyoutMenuWrapper
            items={convertBlockMenuItems}
            onClickCallback={() => setShowConvertMenu(false)}
            onClickOutside={() => setShowConvertMenu(false)}
            open={showConvertMenu}
            parentRef={refConvertBlock}
            rightOffset={0}
            topOffset={4}
            uuid="CommandButtons/convert_block"
          >
            <Tooltip
              appearBefore
              default
              label={(
                <Text>
                  Convert block
                </Text>
              )}
              size={DEFAULT_ICON_SIZE}
              widthFitContent
            >
              <Button
                noBackground
                noBorder
                noPadding
                onClick={() => setShowConvertMenu(!showConvertMenu)}
                ref={refConvertBlock}
              >
                <Convert size={DEFAULT_ICON_SIZE} />
              </Button>
            </Tooltip>
          </FlyoutMenuWrapper>
        </Spacing>
      )}

      {!hideExtraButtons && ([
        BlockTypeEnum.DATA_LOADER,
        BlockTypeEnum.TRANSFORMER,
      ].includes(block.type) && !isStreaming && !isIntegration) && (
        <>
          <Spacing
            ml={PADDING_UNITS}
            ref={refAddChart}
          >
            <Tooltip
              appearBefore
              default
              label="Add chart"
              size={UNIT * 2.25}
              widthFitContent
            >
              <Button
                noBackground
                noBorder
                noPadding
                onClick={() => setShowAddCharts(currState => !currState)}
              >
                <Charts size={UNIT * 2.25} />
              </Button>
            </Tooltip>
          </Spacing>

          {addWidget && (
            <ClickOutside
              disableEscape
              onClickOutside={() => setShowAddCharts(false)}
              open={showAddCharts}
            >
              <AddChartMenu
                addWidget={addWidget}
                block={block}
                onClickCallback={() => setShowAddCharts(false)}
                open={showAddCharts}
                parentRef={refAddChart}
                rightOffset={UNIT * 9}
                runBlock={runBlock}
                topOffset={UNIT * 2}
              />
            </ClickOutside>
          )}
        </>
      )}

      {!hideExtraButtons && isMarkdown && (
        <Spacing ml={PADDING_UNITS}>
          <Tooltip
            appearBefore
            default
            label={isEditingBlock ? 'Close editor' : 'Edit'}
            size={DEFAULT_ICON_SIZE}
            widthFitContent
          >
            <Button
              noBackground
              noBorder
              noPadding
              onClick={() => setIsEditingBlock(prevState => !prevState)}
            >
              {isEditingBlock
                ? <Check size={DEFAULT_ICON_SIZE} success />
                : <Edit size={DEFAULT_ICON_SIZE} />
              }
            </Button>
          </Tooltip>
        </Spacing>
      )}

      {!hideExtraButtons && BlockTypeEnum.GLOBAL_DATA_PRODUCT !== block?.type && (
        <div ref={refAIActions}>
          <Spacing ml={PADDING_UNITS}>
            {isLoadingUpdatePipeline && (
              <Spinner inverted small />
            )}

            {!isLoadingUpdatePipeline && (
              <Tooltip
                appearBefore
                default
                label={(
                  <Text>
                    AI actions
                  </Text>
                )}
                size={DEFAULT_ICON_SIZE}
                widthFitContent
              >
                <Button
                  noBackground
                  noBorder
                  noPadding
                  onClick={() => setShowAIActions(currState => !currState)}
                >
                  <AISparkle default size={DEFAULT_ICON_SIZE} />
                </Button>
              </Tooltip>
            )}
          </Spacing>
        </div>
      )}

      {!hideExtraButtons && (
        <ClickOutside
          disableEscape
          onClickOutside={() => setShowAIActions(false)}
          open={showAIActions}
        >
          <FlyoutMenu
            items={itemsAIActions}
            onClickCallback={() => setShowAIActions(false)}
            open={showAIActions}
            parentRef={refAIActions}
            rightOffset={UNIT * 4.75}
            topOffset={UNIT * 2}
            uuid="FileHeaderMenu/AI_actions"
          />
        </ClickOutside>
      )}

      {!hideExtraButtons && (
        <Spacing ml={PADDING_UNITS}>
          <Tooltip
            appearBefore
            default
            label="View and edit settings for this block"
            size={DEFAULT_ICON_SIZE}
            widthFitContent
          >
            <Button
              noBackground
              noBorder
              noPadding
              onClick={() => openSidekickView?.(ViewKeyEnum.BLOCK_SETTINGS)}
            >
              <SettingsWithKnobs default size={DEFAULT_ICON_SIZE} />
            </Button>
          </Tooltip>
        </Spacing>
      )}

      {!hideExtraButtons && (
        <div ref={refMoreActions}>
          <Spacing ml={PADDING_UNITS}>
            <Tooltip
              appearBefore
              default
              label={(
                <Text>
                  More actions
                </Text>
              )}
              size={DEFAULT_ICON_SIZE}
              widthFitContent
            >
              <Button
                noBackground
                noBorder
                noPadding
                onClick={() => setShowMoreActions(currState => !currState)}
              >
                <Circle
                  borderSize={1.5}
                  default
                  size={DEFAULT_ICON_SIZE}
                >
                  <Ellipsis default size={UNIT} />
                </Circle>
              </Button>
            </Tooltip>
          </Spacing>
        </div>
      )}

      {!hideExtraButtons && (
        <ClickOutside
          disableEscape
          onClickOutside={() => setShowMoreActions(false)}
          open={showMoreActions}
        >
          <FlyoutMenu
            items={getMoreActionsItems(
              block,
              runBlock,
              deleteBlock,
              setOutputCollapsed,
              isStreaming || isIntegration,
              {
                addNewBlock,
                blocksMapping,
                fetchFileTree,
                fetchPipeline,
                openSidekickView,
                project,
                savePipelineContent,
                updatePipeline,
              },
            )}
            onClickCallback={() => setShowMoreActions(false)}
            open={showMoreActions}
            parentRef={refMoreActions}
            rightOffset={UNIT * 4.75}
            topOffset={UNIT * 2}
            uuid="FileHeaderMenu/file_items"
          />
        </ClickOutside>
      )}
    </FlexContainer>
  );
}

export default CommandButtons;
