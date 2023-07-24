import { useCallback, useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import MarkdownPen from '@oracle/icons/custom/MarkdownPen';
import ScratchpadPen from '@oracle/icons/custom/ScratchpadPen';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Tooltip from '@oracle/components/Tooltip';
import {
  ArrowsAdjustingFrameSquare,
  BlockBlank,
  BlockGeneric,
  CircleWithArrowUp,
  CubeWithArrowDown,
  DBT as DBTIcon,
  FrameBoxSelection,
  Sensor,
  TemplateShapes,
} from '@oracle/icons';
import {
  BLOCK_TYPE_NAME_MAPPING,
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import {
  ButtonWrapper,
  ContainerStyle,
  DividerStyle,
  ICON_SIZE,
} from './index.style';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getdataSourceMenuItems } from '../utils';

const BUTTON_INDEX_TEMPLATES = 0;
const BUTTON_INDEX_CUSTOM = 1;

type AddNewBlocksV2Props = {
  addNewBlock: (block: BlockRequestPayloadType) => void;
  blockIdx: number;
  blockTemplatesByBlockType: {
    [blockType: string]: {
      [language: string]: FlyoutMenuItemType;
    };
  };
  itemsDBT: FlyoutMenuItemType[];
  pipelineType: PipelineTypeEnum;
  setAddNewBlockMenuOpenIdx?: (cb: any) => void;
  showBrowseTemplates?: (opts?: {
    addNew?: boolean;
    addNewBlock: (block: BlockRequestPayloadType) => void;
    blockType?: BlockTypeEnum;
    language?: BlockLanguageEnum;
  }) => void;
};

function AddNewBlocksV2({
  addNewBlock,
  blockIdx,
  blockTemplatesByBlockType,
  itemsDBT,
  pipelineType,
  setAddNewBlockMenuOpenIdx,
  showBrowseTemplates,
}: AddNewBlocksV2Props) {
  const buttonRefTemplates = useRef(null);
  const buttonRefCustom = useRef(null);

  const [buttonMenuOpenIndex, setButtonMenuOpenIndex] = useState<number>(null);

  const closeButtonMenu = useCallback(() => setButtonMenuOpenIndex(null), []);
  const handleBlockZIndex = useCallback((newButtonMenuOpenIndex: number) =>
    setAddNewBlockMenuOpenIdx?.(idx => (
      (idx === null || buttonMenuOpenIndex !== newButtonMenuOpenIndex)
        ? blockIdx
        : null
    )),
    [blockIdx, buttonMenuOpenIndex, setAddNewBlockMenuOpenIdx],
  );

  const itemsDataLoader = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.DATA_LOADER,
    pipelineType,
    {
      blockTemplatesByBlockType,
      v2: true,
    },
  )?.find(({
    uuid,
  }) => uuid === `${BlockTypeEnum.DATA_LOADER}/${BlockLanguageEnum.PYTHON}`)?.items,
  [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);

  const itemsDataExporter = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.DATA_EXPORTER,
    pipelineType,
    {
      blockTemplatesByBlockType,
      v2: true,
    },
  )?.find(({
      uuid,
  }) => uuid === `${BlockTypeEnum.DATA_EXPORTER}/${BlockLanguageEnum.PYTHON}`)?.items,
  [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);

  const itemsTransformer = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.TRANSFORMER,
    pipelineType,
    {
      blockTemplatesByBlockType,
      v2: true,
    },
  )?.find(({
    uuid,
  }) => uuid === `${BlockTypeEnum.TRANSFORMER}/${BlockLanguageEnum.PYTHON}`)?.items, [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);

  const itemsSensors = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.SENSOR,
    pipelineType,
    {
      blockTemplatesByBlockType,
      v2: true,
    },
  )?.find(({
      uuid,
  }) => uuid === `${BlockTypeEnum.SENSOR}/${BlockLanguageEnum.PYTHON}`)?.items,
  [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);

  const itemsTemplates = useMemo(() => [
    {
      beforeIcon: (
        <CubeWithArrowDown
          fill={getColorsForBlockType(
            BlockTypeEnum.DATA_LOADER,
          ).accent}
          size={ICON_SIZE}
        />
      ),
      items: itemsDataLoader,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DATA_LOADER],
      uuid: `${BlockTypeEnum.DATA_LOADER}/${BlockLanguageEnum.PYTHON}`,
    },
    {
      beforeIcon: (
        <FrameBoxSelection
          fill={getColorsForBlockType(
            BlockTypeEnum.TRANSFORMER,
          ).accent}
          size={ICON_SIZE}
        />
      ),
      items: itemsTransformer,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.TRANSFORMER],
      uuid: `${BlockTypeEnum.TRANSFORMER}/${BlockLanguageEnum.PYTHON}`,
    },
    {
      beforeIcon: (
        <CircleWithArrowUp
          fill={getColorsForBlockType(
            BlockTypeEnum.DATA_EXPORTER,
          ).accent}
          size={ICON_SIZE}
        />
      ),
      items: itemsDataExporter,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DATA_EXPORTER],
      uuid: `${BlockTypeEnum.DATA_EXPORTER}/${BlockLanguageEnum.PYTHON}`,
    },
    {
      beforeIcon: (
        <Sensor
          fill={getColorsForBlockType(
            BlockTypeEnum.SENSOR,
          ).accent}
          size={ICON_SIZE}
        />
      ),
      items: itemsSensors,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.SENSOR],
      uuid: `${BlockTypeEnum.SENSOR}/${BlockLanguageEnum.PYTHON}`,
    },
    {
      beforeIcon: (
        <DBTIcon
          fill={getColorsForBlockType(
            BlockTypeEnum.DBT,
          ).accent}
          size={ICON_SIZE}
        />
      ),
      items: itemsDBT,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DBT],
      uuid: BlockTypeEnum.DBT,
    },
    {
      isGroupingTitle: true,
      label: () => 'Custom templates',
      uuid: 'custom_templates',
    },
    {
      beforeIcon: <TemplateShapes default size={ICON_SIZE} />,
      label: () => 'Browse templates',
      onClick: () => showBrowseTemplates({
        addNewBlock,
      }),
      uuid: 'browse_templates',
    },
    {
      beforeIcon: <ArrowsAdjustingFrameSquare default size={ICON_SIZE} />,
      label: () => 'Create new template',
      onClick: () => showBrowseTemplates({
        addNew: true,
        addNewBlock,
      }),
      uuid: 'create_template',
    },
  ], [
    addNewBlock,
    itemsDataExporter,
    itemsDataLoader,
    itemsDBT,
    itemsSensors,
    itemsTransformer,
    showBrowseTemplates,
  ]);

  const itemsCustom = useMemo(() => [
    {
      beforeIcon: <BlockGeneric default size={ICON_SIZE} />,
      label: () => 'Custom block',
      onClick: () => {
        addNewBlock({
          type: BlockTypeEnum.CUSTOM,
        });
      },
      uuid: 'custom_block',
    },
    {
      beforeIcon: <ScratchpadPen default size={ICON_SIZE} />,
      label: () => 'Scratchpad',
      onClick: () => {
        addNewBlock({
          language: BlockLanguageEnum.PYTHON,
          type: BlockTypeEnum.SCRATCHPAD,
        });
      },
      uuid: 'scratchpad',
    },
  ], [
    addNewBlock,
  ]);

  return (
    <ClickOutside
      onClickOutside={closeButtonMenu}
      open
    >
      <ContainerStyle>
        <FlexContainer
          alignItems="center"
        >
          <ButtonWrapper increasedZIndex={BUTTON_INDEX_TEMPLATES === buttonMenuOpenIndex}>
            <FlyoutMenuWrapper
              disableKeyboardShortcuts
              items={itemsTemplates}
              onClickCallback={closeButtonMenu}
              open={BUTTON_INDEX_TEMPLATES === buttonMenuOpenIndex}
              parentRef={buttonRefTemplates}
              uuid="button_templates"
            >
              <Tooltip
                block
                label="Add a block from a template"
                size={null}
                widthFitContent
              >
                <Button
                  iconOnly
                  noBackground
                  noBorder
                  noPadding
                  onClick={(e) => {
                    e.preventDefault();
                    setButtonMenuOpenIndex(val =>
                      val === BUTTON_INDEX_TEMPLATES
                        ? null
                        : BUTTON_INDEX_TEMPLATES,
                    );
                    handleBlockZIndex(BUTTON_INDEX_TEMPLATES);
                  }}
                >
                  <TemplateShapes size={ICON_SIZE} />
                </Button>
              </Tooltip>
            </FlyoutMenuWrapper>
          </ButtonWrapper>

          <Spacing mr={3} />

          <ButtonWrapper increasedZIndex={BUTTON_INDEX_CUSTOM === buttonMenuOpenIndex}>
            <FlyoutMenuWrapper
              disableKeyboardShortcuts
              items={itemsCustom}
              onClickCallback={closeButtonMenu}
              open={BUTTON_INDEX_CUSTOM === buttonMenuOpenIndex}
              parentRef={buttonRefCustom}
              uuid="button_custom"
            >
              <Tooltip
                block
                label="Add a blank custom block or scratchpad block"
                size={null}
                widthFitContent
              >
                <Button
                  iconOnly
                  noBackground
                  noBorder
                  noPadding
                  onClick={(e) => {
                    e.preventDefault();
                    setButtonMenuOpenIndex(val =>
                      val === BUTTON_INDEX_CUSTOM
                        ? null
                        : BUTTON_INDEX_CUSTOM,
                    );
                    handleBlockZIndex(BUTTON_INDEX_CUSTOM);
                  }}
                >
                  <BlockBlank size={ICON_SIZE} />
                </Button>
              </Tooltip>
            </FlyoutMenuWrapper>
          </ButtonWrapper>

          <Spacing mr={3} />

          <Tooltip
            block
            label="Add a markdown block for documentation"
            size={null}
            widthFitContent
          >
            <Button
              iconOnly
              noBackground
              noBorder
              noPadding
              onClick={(e) => {
                e.preventDefault();
                addNewBlock({
                  language: BlockLanguageEnum.MARKDOWN,
                  type: BlockTypeEnum.MARKDOWN,
                });
              }}
            >
              <MarkdownPen size={ICON_SIZE} />
            </Button>
          </Tooltip>

          <Spacing mr={3} />

          <DividerStyle />

          <Spacing mr={3} />

          <TextInput
            fullWidth
            noBackground
            noBorder
            paddingHorizontal={0}
            paddingVertical={0}
            placeholder="Add block that..."
          />
        </FlexContainer>
      </ContainerStyle>
    </ClickOutside>
  );
}

export default AddNewBlocksV2;
