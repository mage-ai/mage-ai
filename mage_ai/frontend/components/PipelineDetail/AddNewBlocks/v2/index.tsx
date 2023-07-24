import { useCallback, useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import MarkdownPen from '@oracle/icons/custom/MarkdownPen';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Tooltip from '@oracle/components/Tooltip';
import { AxisEnum } from '@interfaces/ActionPayloadType';
import {
  ArrowsAdjustingFrameSquare,
  BlockBlank,
  BlockCubePolygon,
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
import {
  COLUMN_ACTION_GROUPINGS,
  ROW_ACTION_GROUPINGS,
} from '@interfaces/TransformerActionType';
import {
  createActionMenuGroupings,
  createColorMenuItems,
  getdataSourceMenuItems,
  getNonPythonMenuItems,
  groupBlockTemplates,
} from '../utils';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

const BUTTON_INDEX_TEMPLATES = 0;

function AddNewBlocksV2({
  addNewBlock,
  blockIdx,
  blockTemplatesByBlockType,
  itemsDBT,
  pipelineType,
  setAddNewBlockMenuOpenIdx,
  showBrowseTemplates,
}) {
  const buttonRefTemplates = useRef(null);

  const [buttonMenuOpenIndex, setButtonMenuOpenIndex] = useState<number>(BUTTON_INDEX_TEMPLATES);

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
      // showBrowseTemplates,
    },
  )?.find(({
    uuid,
  }) => uuid === `${BlockTypeEnum.DATA_LOADER}/${BlockLanguageEnum.PYTHON}`)?.items,
  [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
    // showBrowseTemplates,
  ]);

  const itemsDataExporter = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.DATA_EXPORTER,
    pipelineType,
    {
      blockTemplatesByBlockType,
      // showBrowseTemplates,
    },
  )?.find(({
      uuid,
  }) => uuid === `${BlockTypeEnum.DATA_EXPORTER}/${BlockLanguageEnum.PYTHON}`)?.items,
  [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
    // showBrowseTemplates,
  ]);

  const columnActionMenuItems = useMemo(() => createActionMenuGroupings(
    COLUMN_ACTION_GROUPINGS,
    AxisEnum.COLUMN,
    addNewBlock,
  ), [
    addNewBlock,
  ]);
  const rowActionMenuItems = useMemo(() => createActionMenuGroupings(
    ROW_ACTION_GROUPINGS,
    AxisEnum.ROW,
    addNewBlock,
  ), [
    addNewBlock,
  ]);

  const allActionMenuItems = useMemo(() => {
    const arr: FlyoutMenuItemType[] = [
      // {
      //   label: () => 'Generic (no template)',
      //   onClick: () => {
      //     addNewBlock({
      //       language: BlockLanguageEnum.PYTHON,
      //       type: BlockTypeEnum.TRANSFORMER,
      //     });
      //   },
      //   uuid: 'generic_transformer_action',
      // },
      {
        bold: true,
        items: rowActionMenuItems,
        label: () => 'Row actions',
        uuid: 'row_actions_grouping',
      },
      {
        isGroupingTitle: true,
        label: () => 'Column actions',
        uuid: 'column_actions_grouping',
      },
      ...columnActionMenuItems,
    ];

    // if (!hideTransformerDataSources) {
    //   arr.splice(
    //     1,
    //     0,
    //     {
    //       bold: true,
    //       items: getdataSourceMenuItems(addNewBlock, BlockTypeEnum.TRANSFORMER, pipelineType),
    //       label: () => 'Data sources',
    //       uuid: 'data_sources_grouping',
    //     },
    //   );
    // }

    return arr;
  }, [
    addNewBlock,
    columnActionMenuItems,
    // hideTransformerDataSources,
    pipelineType,
    rowActionMenuItems,
  ]);

  const itemsTransformer = useMemo(() => {
    // if (isPySpark || PipelineTypeEnum.INTEGRATION === pipelineType) {
    //   return allActionMenuItems;
    // }

    // if (isStreamingPipeline) {
    //   return [
    //     {
    //       items: getdataSourceMenuItems(addNewBlock, BlockTypeEnum.TRANSFORMER, pipelineType),
    //       label: () => 'Python',
    //       uuid: 'transformers/python',
    //     },
    //   ];
    // }

    // return [
    //   {
    //     items: allActionMenuItems,
    //     label: () => 'Python',
    //     uuid: 'transformers/python_all',
    //   },
    // ];

    return getdataSourceMenuItems(
      addNewBlock,
      BlockTypeEnum.TRANSFORMER,
      pipelineType,
      {
        blockTemplatesByBlockType,
        // showBrowseTemplates,
      },
    )?.find(({
      uuid,
    }) => uuid === `${BlockTypeEnum.TRANSFORMER}/${BlockLanguageEnum.PYTHON}`)?.items;
  }, [
    addNewBlock,
    allActionMenuItems,
    blockTemplatesByBlockType,
    // isPySpark,
    // isStreamingPipeline,
    pipelineType,
    // showBrowseTemplates,
  ]);

  const itemsSensors = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.SENSOR,
    pipelineType,
    {
      blockTemplatesByBlockType,
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
        <BlockCubePolygon
          fill={getColorsForBlockType(
            BlockTypeEnum.DATA_LOADER,
          ).accent}
        />
      ),
      items: itemsDataLoader,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DATA_LOADER],
      uuid: `${BlockTypeEnum.DATA_LOADER}/${BlockLanguageEnum.PYTHON}`,
    },
    {
      beforeIcon: (
        <BlockCubePolygon
          fill={getColorsForBlockType(
            BlockTypeEnum.TRANSFORMER,
          ).accent}
        />
      ),
      items: itemsTransformer,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.TRANSFORMER],
      uuid: `${BlockTypeEnum.TRANSFORMER}/${BlockLanguageEnum.PYTHON}`,
    },
    {
      beforeIcon: (
        <BlockCubePolygon
          fill={getColorsForBlockType(
            BlockTypeEnum.DATA_EXPORTER,
          ).accent}
        />
      ),
      items: itemsDataExporter,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DATA_EXPORTER],
      uuid: `${BlockTypeEnum.DATA_EXPORTER}/${BlockLanguageEnum.PYTHON}`,
    },
    {
      beforeIcon: (
        <BlockCubePolygon
          fill={getColorsForBlockType(
            BlockTypeEnum.SENSOR,
          ).accent}
        />
      ),
      items: itemsSensors,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.SENSOR],
      uuid: `${BlockTypeEnum.SENSOR}/${BlockLanguageEnum.PYTHON}`,
    },
    {
      beforeIcon: (
        <BlockCubePolygon
          fill={getColorsForBlockType(
            BlockTypeEnum.DBT,
          ).accent}
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
      beforeIcon: <TemplateShapes default />,
      label: () => 'Browse templates',
      onClick: () => showBrowseTemplates({
        addNewBlock,
        // blockType: blockType,
        // language: BlockLanguageEnum.SQL,
      }),
      uuid: 'browse_templates',
    },
    {
      beforeIcon: <ArrowsAdjustingFrameSquare default />,
      label: () => 'Create new template',
      onClick: () => showBrowseTemplates({
        addNew: true,
        addNewBlock,
        // blockType: blockType,
        // language: BlockLanguageEnum.SQL,
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

          <Tooltip
            block
            label="Add a blank custom block"
            size={null}
            widthFitContent
          >
            <Button
              iconOnly
              noBackground
              noBorder
              noPadding
              onClick={() => {
                console.log('blank');
              }}
            >
              <BlockBlank size={ICON_SIZE} />
            </Button>
          </Tooltip>

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
              onClick={() => {
                console.log('markdown');
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
