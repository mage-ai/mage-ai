import { useRef } from 'react';
import {
  NodeItemType,
  PortType,
  ItemMappingType,
  PortMappingType,
  BlocksByGroupType,
  GroupMappingType,
  GroupLevelsMappingType,
  ModelMappingType,
} from '../../Canvas/interfaces';
import { updateModelsAndRelationships } from './utils/nodes';

export type ModelManagerType = {
  blocksByGroupRef: React.MutableRefObject<BlocksByGroupType>;
  frameworkGroupsRef: React.MutableRefObject<GroupMappingType>;
  groupLevelsMappingRef: React.MutableRefObject<GroupLevelsMappingType>;
  itemsRef: React.MutableRefObject<ItemMappingType>;
  mutateModels: (payload?: ModelMappingType) => ModelMappingType;
  portsRef: React.MutableRefObject<PortMappingType>;
  updateNodeItems: (items: ItemMappingType) => void;
  updatePorts: (ports: PortMappingType) => void;
};

export default function useModelManager(): ModelManagerType {
  const blocksByGroupRef = useRef<BlocksByGroupType>({} as BlocksByGroupType);
  const frameworkGroupsRef = useRef<GroupMappingType>({} as GroupMappingType);
  const groupLevelsMappingRef = useRef<GroupLevelsMappingType>([]);
  const itemsRef = useRef<ItemMappingType>({});
  const portsRef = useRef<PortMappingType>({});

  function updateNodeItems(items: ItemMappingType) {
    // This should be the only setter for itemsRef.
    itemsRef.current = {
      ...itemsRef.current,
      ...Object.entries(items).reduce(
        (acc: ItemMappingType, [id, item]: [string, NodeItemType]) => ({
          ...acc,
          [id]: {
            ...item,
            version: String(Number(item?.version ?? -1) + 1),
          },
        }),
        {} as ItemMappingType,
      ),
    };
  }

  function updatePorts(ports: PortMappingType) {
    // This should be the only setter for portsRef.
    portsRef.current = {
      ...portsRef.current,
      ...Object.entries(ports).reduce(
        (acc: PortMappingType, [id, item]: [string, PortType]) => ({
          ...acc,
          [id]: {
            ...item,
            version: String(Number(item?.version ?? -1) + 1),
          },
        }),
        {} as PortMappingType,
      ),
    };
  }

  function mutateModels(payload?: ModelMappingType): ModelMappingType {
    const { items, ports } = updateModelsAndRelationships(
      {
        itemsRef,
        portsRef,
      },
      payload,
    );
    updateNodeItems(items);
    updatePorts(ports);

    return {
      itemMapping: itemsRef.current,
      portMapping: portsRef.current,
    };
  }

  return {
    blocksByGroupRef,
    frameworkGroupsRef,
    groupLevelsMappingRef,
    itemsRef,
    mutateModels,
    portsRef,
    updateNodeItems,
    updatePorts,
  };
}
