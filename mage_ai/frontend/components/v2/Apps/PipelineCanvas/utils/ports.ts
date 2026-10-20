import BlockType from '@interfaces/BlockType';
import {
  ModelMappingType,
  PortType,
  ModelRefsType,
  DragItem,
  GroupMappingType,
  ConnectionMappingType,
  NodeItemMappingType,
  ItemMappingType,
  PortMappingType,
  BlocksByGroupType,
  NodeType,
  RectType,
} from '../../../Canvas/interfaces';
import { PortSubtypeEnum, ItemTypeEnum } from '../../../Canvas/types';
import { createConnection } from '../../../Canvas/Connections/utils';

export function createConnections(
  ports: PortType[],
  modelMappings: ModelMappingType,
  opts?: {
    level?: number;
  },
): ModelMappingType {
  const { level } = opts || {};
  const { itemMapping } = modelMappings;
  ports?.forEach((port: PortType) => {
    let fromItemBlock = null;
    let toItemBlock = null;

    if (PortSubtypeEnum.INPUT === port?.subtype) {
      fromItemBlock = itemMapping?.[port?.target?.id]?.block;
      toItemBlock = itemMapping?.[port?.parent?.id]?.block;
    } else {
      fromItemBlock = itemMapping?.[port?.parent?.id]?.block;
      toItemBlock = itemMapping?.[port?.target?.id]?.block;
    }

    const fromItem = itemMapping?.[(fromItemBlock as BlockType)?.uuid];
    const toItem = itemMapping?.[(toItemBlock as BlockType)?.uuid];

    const fromPort = fromItem?.ports?.find(
      p =>
        p?.target?.block?.uuid === (toItemBlock as BlockType)?.uuid &&
        p.subtype === PortSubtypeEnum.OUTPUT,
    );
    const toPort = toItem?.ports?.find(
      p =>
        p?.target?.block?.uuid === (fromItemBlock as BlockType)?.uuid &&
        p.subtype === PortSubtypeEnum.INPUT,
    );

    if (fromPort) {
      fromPort.rect = { ...fromItem.rect } as RectType;
    }
    if (toPort) {
      toPort.rect = { ...toItem.rect } as RectType;
    }
  });

  return {
    itemMapping,
  };
}
