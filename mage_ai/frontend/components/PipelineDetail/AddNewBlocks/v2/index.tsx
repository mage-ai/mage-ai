import { useCallback, useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import MarkdownPen from '@oracle/icons/custom/MarkdownPen';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Tooltip from '@oracle/components/Tooltip';
import {
  BlockBlank,
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
  createActionMenuGroupings,
  createColorMenuItems,
  getdataSourceMenuItems,
  getNonPythonMenuItems,
  groupBlockTemplates,
} from '../utils';

const BUTTON_INDEX_TEMPLATES = 0;

function AddNewBlocksV2({
  addNewBlock,
  blockIdx,
  blockTemplatesByBlockType,
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
      items: itemsDataLoader,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DATA_LOADER],
      uuid: `${BlockTypeEnum.DATA_LOADER}/${BlockLanguageEnum.PYTHON}`,
    },
    {
      items: [],
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.TRANSFORMER],
      uuid: `${BlockTypeEnum.TRANSFORMER}/${BlockLanguageEnum.PYTHON}`,
    },
    {
      items: itemsDataExporter,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.DATA_EXPORTER],
      uuid: `${BlockTypeEnum.DATA_EXPORTER}/${BlockLanguageEnum.PYTHON}`,
    },
    {
      items: itemsSensors,
      label: () => BLOCK_TYPE_NAME_MAPPING[BlockTypeEnum.SENSOR],
      uuid: `${BlockTypeEnum.SENSOR}/${BlockLanguageEnum.PYTHON}`,
    },
  ], [
    itemsDataExporter,
    itemsDataLoader,
    itemsSensors,
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
