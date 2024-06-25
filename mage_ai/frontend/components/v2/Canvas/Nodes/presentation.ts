import { ItemTypeEnum } from '../types';
import { ColorNameType, getBlockColor, getContrastColor } from '@mana/themes/blocks';
import { countOccurrences, flattenArray, sortByKey } from '@utils/array';
import { NodeItemType, NodeType, PortType, RectType } from '../interfaces';
import BlockType, { StatusTypeEnum, BlockTypeEnum } from '@interfaces/BlockType';

export function getModeColorName(blocks: BlockType[]): ColorNameType {
  if (!blocks?.length) return;

  const typeCounts = Object.entries(
    countOccurrences(flattenArray(blocks?.map(b => b?.type) ?? [])) ?? {},
  )?.map(([type, count]) => ({ count, type }));

  const modeTypes = sortByKey(typeCounts, ({ count }) => count, { ascending: false });
  const modeType = modeTypes?.[0]?.type;

  return getBlockColor(modeType as BlockTypeEnum, { getColorName: true })?.names;
}

export const blockColorNames = (node: NodeItemType, isSelectedGroup?: boolean): ColorNameType & {
  contrast?: { inverted?: string; monotone?: string };
} => {
  if (isSelectedGroup) {
    return {
      base: 'pink',
      hi: 'pinkHi',
      lo: 'pinkLo',
      md: 'pinkMd',
      contrast: getContrastColor('pink'),
    };
  }

  const type = node?.block?.type;
  if (!type || [BlockTypeEnum.GROUP, BlockTypeEnum.PIPELINE].includes(type)) {
    return getBlockColor(type ?? BlockTypeEnum.GROUP, { getColorName: true })?.names;
  }

  if (ItemTypeEnum.NODE === node?.type) {
    // Use the color of the most common block type in the group.
    const typeCounts = Object.entries(
      countOccurrences(
        flattenArray((node as NodeType)?.items?.map(i => (i as NodeItemType)?.block?.type) || []),
      ) ?? {},
    )?.map(([type, count]) => ({ type, count }));

    const modeTypes = sortByKey(typeCounts, ({ count }) => count, { ascending: false });
    const modeType = modeTypes?.length >= 2 ? modeTypes?.[0]?.type : node?.block?.type;
    const colors = getBlockColor(modeType as BlockTypeEnum, { getColorName: true })?.names;

    return colors?.base ? colors : { base: 'gray' };
  }

  const c = getBlockColor(type as BlockTypeEnum, { getColorName: true });
  return c && c?.names ? c?.names : { base: 'gray' };
};

export const borderConfigs = (node: NodeItemType, isSelectedGroup?: boolean) => {
  const arr = [blockColorNames(node, isSelectedGroup)?.base || ''];

  node?.ports?.forEach(({ target }) => {
    const cn = getBlockColor(target?.block?.type as BlockTypeEnum, { getColorName: true })?.names
      ?.base;
    if (!arr.includes(cn)) {
      arr.push(cn);
    }
  });

  const c = arr?.reduce((acc, c) => (c ? acc.concat({ baseColorName: c }) : acc), []);
  if (!c?.length) {
    if (isSelectedGroup) {
      c.push(...[{ baseColorName: 'red' }, { baseColorName: 'yellow' }]);
    } else {
      c.push({ baseColorName: 'gray' });
    }
  }

  if (!isSelectedGroup) {
    return c.slice(0, 1);
  }

  return c;
};
