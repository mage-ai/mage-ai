import { useContext, useMemo, useRef, useState } from 'react';
import { ThemeContext } from 'styled-components';

import AddChartMenu from './AddChartMenu';
import BlockType, {
  BlockTypeEnum,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import ClickOutside from '@oracle/components/ClickOutside';
import Convert from '@oracle/icons/custom/Convert';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import dark from '@oracle/styles/themes/dark';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import {
  Close,
  Ellipsis,
  NavGraph,
  PlayButtonFilled,
} from '@oracle/icons';
import {
  KEY_SYMBOL_CONTROL,
  KEY_SYMBOL_ENTER,
  KEY_SYMBOL_I,
  KEY_SYMBOL_META,
} from '@utils/hooks/keyboardShortcuts/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { buildConvertBlockMenuItems, getMoreActionsItems } from '../utils';
import { getColorsForBlockType } from '../index.style';
import { isMac } from '@utils/os';
import { indexBy } from '@utils/array';

export type CommandButtonsSharedProps = {
  addWidget: (widget: BlockType, opts?: {
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
  fetchPipeline: () => void;
  pipelineType?: PipelineTypeEnum;
  runBlock: (payload: {
    block: BlockType;
    code?: string;
    disableReset?: boolean;
    runDownstream?: boolean;
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
  setOutputCollapsed: (outputCollapsed: boolean) => void;
  visible: boolean;
} & CommandButtonsSharedProps;

function CommandButtons({
  addNewBlock,
  addWidget,
  block,
  blocks,
  deleteBlock,
  executionState,
  fetchPipeline,
  interruptKernel,
  pipelineType,
  runBlock,
  savePipelineContent,
  setOutputCollapsed,
  visible,
}: CommandButtonsProps) {
  const {
    all_upstream_blocks_executed: upstreamBlocksExecuted = true,
    color: blockColor,
    type,
    uuid,
  } = block;
  const refAddChart = useRef(null);
  const refConvertBlock = useRef(null);
  const refExecuteActions = useRef(null);
  const refMoreActions = useRef(null);

  const [showAddCharts, setShowAddCharts] = useState<boolean>(false);
  const [showConvertMenu, setShowConvertMenu] = useState<boolean>(false);
  const [showExecuteActions, setShowExecuteActions] = useState<boolean>(false);
  const [showMoreActions, setShowMoreActions] = useState<boolean>(false);

  const themeContext = useContext(ThemeContext);
  const isInProgress = ExecutionStateEnum.IDLE !== executionState;
  const color = getColorsForBlockType(
    type,
    { blockColor: blockColor, theme: themeContext },
  ).accent;
  const isStreamingPipeline = pipelineType === PipelineTypeEnum.STREAMING;

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

      {(!isInProgress && !isStreamingPipeline) &&  (
        <>
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
            size={UNIT * 2.5}
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
                size={UNIT * 2.5}
              >
                <Close size={UNIT * 1} />
              </Circle>
            </Button>
          </Tooltip>
        </Spacing>
      )}

      {(BlockTypeEnum.SCRATCHPAD === block.type && !isStreamingPipeline) && (
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
              size={UNIT * 2.5}
              widthFitContent
            >
              <Button
                noBackground
                noBorder
                noPadding
                onClick={() => setShowConvertMenu(!showConvertMenu)}
                ref={refConvertBlock}
              >
                <Convert size={UNIT * 2.5} />
              </Button>
            </Tooltip>
          </FlyoutMenuWrapper>
        </Spacing>
      )}

      {([
        BlockTypeEnum.DATA_LOADER,
        BlockTypeEnum.TRANSFORMER,
      ].includes(block.type) && !isStreamingPipeline) && (
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
                <NavGraph size={UNIT * 2.25} />
              </Button>
            </Tooltip>
          </Spacing>

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
        </>
      )}

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
            size={UNIT * 2.5}
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
                size={UNIT * 2.5}
              >
                <Ellipsis size={UNIT} />
              </Circle>
            </Button>
          </Tooltip>
        </Spacing>
      </div>
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
            isStreamingPipeline,
            {
              blocksMapping,
              fetchPipeline,
              savePipelineContent,
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
    </FlexContainer>
  );
}

export default CommandButtons;
