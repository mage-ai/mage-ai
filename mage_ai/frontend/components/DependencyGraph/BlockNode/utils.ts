import BlockType, {
  BLOCK_TYPE_NAME_MAPPING,
  BlockLanguageEnum,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import { UNIT } from '@oracle/styles/units/spacing';
import { buildTags } from '@components/CodeBlock/utils';
import { getModelAttributes } from '@utils/models/dbt';
import { parse } from 'yaml';

const WIDTH_OF_HEADER_TEXT_CHARACTER = 8.62;
const WIDTH_OF_SMALL_CHARACTER = 7.39;

// Border vertical
const NODE_HEIGHT = 2;
// Border horizontal
const NODE_WIDTH = 2;

// Padding vertical, icon height
const HEADER_HEIGHT = (UNIT * 2) + (UNIT * 5);
// Padding horizontal, icon height, margin between icon and text
const HEADER_WIDTH = (UNIT * 2) + (UNIT * 5) + (UNIT * 2);

const BADGE_HEIGHT = 22;
const MAX_WIDTH = UNIT * 40;
const TAG_HEIGHT = 18;

export function blockTagsText(block: BlockType): string {
  const tags = buildTags(block);

  return tags?.map(({ title }) => title).join(', ') || '';
}

export function displayTextForBlock(block: BlockType, pipeline: BlockType): {
  displayText: string;
  subtitle?: string;
} {
  const {
    type,
  } = block;

  let displayText;
  let subtitle = BLOCK_TYPE_NAME_MAPPING?.[type] || type;

  if (PipelineTypeEnum.INTEGRATION === pipeline?.type && BlockTypeEnum.TRANSFORMER !== block.type) {
    let contentParsed: {
      destination?: string;
      source?: string;
    } = {};
    if (BlockLanguageEnum.YAML === block.language) {
      contentParsed = parse(block.content);
    }

    if (BlockTypeEnum.DATA_LOADER === block.type) {
      displayText = `${block.uuid}: ${contentParsed?.source}`;
    } else if (BlockTypeEnum.DATA_EXPORTER === block.type) {
      displayText = `${block.uuid}: ${contentParsed?.destination}`;
    }
  } else if (BlockTypeEnum.DBT === block.type && BlockLanguageEnum.SQL === block.language) {
    const {
      name: modelName,
      project,
    } = getModelAttributes(block);
    displayText = modelName;
    subtitle = `${subtitle}/${project}`;
  }

  if (block?.replicated_block) {
    displayText = block?.replicated_block;
    subtitle = block?.uuid;
  }

  if (!displayText) {
    displayText = block.uuid;
  }

  return {
    displayText,
    subtitle,
  };
}

export function getBlockHeaderText(block: BlockType, pipeline: PipelineType): string {
  const {
    displayText,
  } = displayTextForBlock(block, pipeline);
  return displayText || '';
}

export function getBlockHeaderSubtitle(block: BlockType, pipeline: PipelineType): string {
  const {
    subtitle,
  } = displayTextForBlock(block, pipeline);
  return subtitle || '';
}

export function getBlockNodeHeight(block: BlockType, pipeline: PipelineType, opts: {
  callbackBlocks: BlockType;
  conditionalBlocks: BlockType;
  extensionBlocks: BlockType;
}): number {
  let spacingBetweenRowsCount = 0;

  // Body padding top
  let height = NODE_HEIGHT + HEADER_HEIGHT;

  const width = getBlockNodeWidth(block, pipeline);
  const widthWithoutPadding = width - (NODE_WIDTH + (UNIT * 2));

  const tagsText = blockTagsText(block);
  const tagsTextWidth = tagsText?.length * WIDTH_OF_SMALL_CHARACTER;

  if (tagsTextWidth >= 1) {
    let lines = 1;
    if (tagsTextWidth > widthWithoutPadding) {
      lines = Math.ceil(tagsTextWidth / widthWithoutPadding);
    }
    spacingBetweenRowsCount += 1;
    height += TAG_HEIGHT * lines;
  }

  const {
    callbackBlocks,
    conditionalBlocks,
    extensionBlocks,
  } = opts || {};

  if (callbackBlocks?.length >= 1) {
    spacingBetweenRowsCount += 1;
    height += BADGE_HEIGHT;
  }

  if (conditionalBlocks?.length >= 1) {
    spacingBetweenRowsCount += 1;
    height += BADGE_HEIGHT;
  }

  if (extensionBlocks?.length >= 1) {
    spacingBetweenRowsCount += 1;
    height += BADGE_HEIGHT;
  }

  // Spacing between last row and bottom of node
  spacingBetweenRowsCount += 1;

  height += spacingBetweenRowsCount * (UNIT * 1);

  return height;
}

export function getBlockNodeWidth(block: BlockType, pipeline: PipelineType): number {
  let longestTextLength = Math.max(
    getBlockHeaderText(block, pipeline)?.length * WIDTH_OF_HEADER_TEXT_CHARACTER,
    getBlockHeaderSubtitle(block, pipeline)?.length * WIDTH_OF_SMALL_CHARACTER,
  );

  const tagsText = blockTagsText(block);
  const tagsTextWidth = tagsText?.length * WIDTH_OF_SMALL_CHARACTER;

  if (tagsTextWidth > longestTextLength) {
    longestTextLength = Math.min(MAX_WIDTH, tagsTextWidth);
  }

  // width: (longestText.length * WIDTH_OF_SINGLE_CHARACTER_SMALL)
  //         + (disabledProp ? 0 : UNIT * 5)
  //         + (blockEditing?.uuid === block.uuid ? (19 * WIDTH_OF_SINGLE_CHARACTER_SMALL) : 0)
  //         + (blockStatus?.[getBlockRunBlockUUID(block)]?.runtime ? 50 : 0),

  return NODE_WIDTH + HEADER_WIDTH + longestTextLength;
}
