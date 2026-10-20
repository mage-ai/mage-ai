import BlockType, {
  ABBREV_BLOCK_LANGUAGE_MAPPING,
  BLOCK_TYPE_NAME_MAPPING,
  BlockLanguageEnum,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import { BORDER_WIDTH } from './index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { buildTags } from '@components/CodeBlock/utils';
import { getModelAttributes } from '@utils/models/dbt';
import { parse } from 'yaml';

export const HEADER_SPACING_HORIZONTAL_UNITS = PADDING_UNITS;
const HEADER_SPACING_HORIZONTAL = PADDING_UNITS * UNIT;
export const STATUS_SIZE = UNIT * 2;

export const WIDTH_OF_HEADER_TEXT_CHARACTER = 8.62;
export const WIDTH_OF_SMALL_CHARACTER = 7.43;

// Border vertical
const NODE_HEIGHT = BORDER_WIDTH * 2;
// Border horizontal
const NODE_WIDTH = BORDER_WIDTH * 2;

// Padding vertical, icon height
const HEADER_HEIGHT = (UNIT * 2) + (UNIT * 5);
// Padding horizontal, icon width, margin between icon and text, margin between text and status, status size
const HEADER_WIDTH = (UNIT * 2)
  + (UNIT * 5)
  + HEADER_SPACING_HORIZONTAL
  + HEADER_SPACING_HORIZONTAL
  + STATUS_SIZE;

const BADGE_HEIGHT = 18.5;
const MAX_WIDTH = UNIT * 30;
const TAG_HEIGHT = 18;
// Padding left and right is 2px each
const BADGE_PADDING_TOTAL = 2 * 2;
const BADGE_SPACING_HORIZONTAL = 4;
const BADGE_SPACING_VERTICAL = 4;

export function blockTagsText(block: BlockType): string {
  const tags = buildTags(block || {});

  if (tags?.length >= 1) {
    return tags?.map(({ title }) => title).join(', ') || '';
  }

  if (BlockTypeEnum.GLOBAL_DATA_PRODUCT === block?.type) {
    const gdp = block?.configuration?.global_data_product;
    if (gdp?.uuid) {
      return gdp?.uuid;
    }
  }

  return ABBREV_BLOCK_LANGUAGE_MAPPING[block?.language] || '';
}

export function displayTextForBlock(block: BlockType, pipeline: PipelineType): {
  displayText: string;
  subtitle?: string;
} {
  const {
    description,
    name,
    type,
  } = block;

  let displayText;
  let subtitle = description || BLOCK_TYPE_NAME_MAPPING?.[type] || type;

  if (PipelineTypeEnum.INTEGRATION === pipeline?.type && BlockTypeEnum.TRANSFORMER !== block.type) {
    let contentParsed: {
      destination?: string;
      source?: string;
    } = {};
    if (BlockLanguageEnum.YAML === block.language && block?.content?.length >= 1) {
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
    if (name && description) {
      displayText = name;
    } else {
      displayText = block?.uuid;
    }

    if (!description) {
      subtitle = block?.replicated_block;
    }
  }

  // Dynamic blocks and data integration blocks
  if (block?.uuid?.split(':')?.length >= 2) {
    if (name) {
      displayText = name;
    }
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

export function getWidthOfBadgeBlocks(blocks: BlockType[]): number {
  let width = 0;

  blocks?.forEach(({ uuid }: BlockType, idx: number) => {
    width += BADGE_PADDING_TOTAL + (uuid.length * WIDTH_OF_SMALL_CHARACTER);

    if (idx >= 1) {
      width += BADGE_SPACING_HORIZONTAL;
    }
  });

  return width;
}

export function getBlockNodeHeight(block: BlockType, pipeline: PipelineType, opts: {
  blockStatus: {
    [uuid: string]: {
      runtime?: number,
    };
  };
  callbackBlocks: BlockType[];
  conditionalBlocks: BlockType[];
  extensionBlocks: BlockType[];
}): number {
  let spacingBetweenRowsCount = 0;

  // Body padding top
  let height = NODE_HEIGHT + HEADER_HEIGHT;

  const width = getBlockNodeWidth(block, pipeline, opts);
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
    blockStatus,
    callbackBlocks,
    conditionalBlocks,
    extensionBlocks,
  } = opts || {};

  [
    callbackBlocks,
    conditionalBlocks,
    extensionBlocks,
  ].forEach((blocks: BlockType[]) => {
    if (blocks?.length >= 1) {
      const blocksWidth = getWidthOfBadgeBlocks(blocks);
      let lines = 1;
      if (blocksWidth > widthWithoutPadding) {
        lines = Math.ceil(blocksWidth / widthWithoutPadding);
      }
      spacingBetweenRowsCount += 1;
      height += (BADGE_HEIGHT * lines) + (BADGE_SPACING_VERTICAL * (lines - 1));
    }
  });

  if (typeof blockStatus?.[block.uuid]?.runtime !== 'undefined') {
    height += TAG_HEIGHT;
    spacingBetweenRowsCount += 1;
  }

  // Spacing between last row and bottom of node
  spacingBetweenRowsCount += 1;

  height += spacingBetweenRowsCount * (UNIT * 1);

  return height;
}

export function getBlockNodeWidth(block: BlockType, pipeline: PipelineType, opts: {
  blockStatus: {
    [uuid: string]: {
      runtime?: number,
    };
  };
  callbackBlocks: BlockType[];
  conditionalBlocks: BlockType[];
  extensionBlocks: BlockType[];
}): number {
  let longestTextLength = Math.max(
    getBlockHeaderText(block, pipeline)?.length * WIDTH_OF_HEADER_TEXT_CHARACTER,
    getBlockHeaderSubtitle(block, pipeline)?.length * WIDTH_OF_SMALL_CHARACTER,
  );

  const tagsText = blockTagsText(block);
  const tagsTextWidth = tagsText?.length * WIDTH_OF_SMALL_CHARACTER;

  const {
    callbackBlocks,
    conditionalBlocks,
    extensionBlocks,
  } = opts || {};

  const textWidth = Math.max(...[
    callbackBlocks,
    conditionalBlocks,
    extensionBlocks,
  ].map((blocks: BlockType[]) => getWidthOfBadgeBlocks(blocks)).concat(tagsTextWidth));

  if (textWidth > longestTextLength) {
    longestTextLength = Math.min(MAX_WIDTH, textWidth);
  }
  return NODE_WIDTH + HEADER_WIDTH + longestTextLength;
}
