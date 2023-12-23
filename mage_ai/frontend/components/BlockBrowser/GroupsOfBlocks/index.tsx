import { useMemo } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import CacheItemType, { CacheItemTypeEnum } from '@interfaces/CacheItemType';
import FlexContainer from '@oracle/components/FlexContainer';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { ALL_BLOCK_TYPES, BlockTypeEnum } from '@interfaces/BlockType';
import { NavLinkType } from '@components/CustomTemplates/BrowseTemplates/constants';
import { NavLinkUUIDEnum } from '../FileBrowserNavigation/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { sortByKey } from '@utils/array';

type GroupsOfBlocksProps = {
  cacheItems: CacheItemType[];
  selectedLinks?: NavLinkType[];
};

function GroupsOfBlocks({
  cacheItems,
  selectedLinks,
}: GroupsOfBlocksProps) {
  const selectedBlockType = useMemo(() => selectedLinks?.find(({
    uuid,
  }) => uuid in ALL_BLOCK_TYPES)?.uuid as BlockTypeEnum, [
    selectedLinks,
  ]);

  if (BlockTypeEnum.DBT === selectedBlockType) {
    const arr = sortByKey(cacheItems, ({ item }) => item?.project?.name).filter(({
      item,
    }) => [NavLinkUUIDEnum.ALL_PROJECTS, item?.project?.uuid].includes(selectedLinks?.[0]?.uuid))

    return (
      <Accordion
        noBorder
        noBoxShadow
        visibleMappingForced={arr?.reduce((acc, key, idx) => ({
          ...acc,
          [String(idx)]: true,
        }), {})}
      >
        {arr?.map(({
          item,
        }) => {
          const {
            name,
            uuid,
          } = item?.project || {
            name: null,
            uuid: null,
          };

          return (
            <AccordionPanel
              key={uuid}
              noBorderRadius
              noPaddingContent
              title={(
                <FlexContainer alignItems="center">
                  <FlexContainer flexDirection="column">
                    <Text monospace>
                      {name}
                    </Text>
                    <Text monospace muted small>
                      {uuid}
                    </Text>
                  </FlexContainer>
                </FlexContainer>
              )}
              titleXPadding={PADDING_UNITS * UNIT}
              titleYPadding={PADDING_UNITS * UNIT}
            >
              <Table
                columnFlex={[null, 1]}
                columns={[
                  {
                    uuid: 'Models',
                  },
                ]}
                rows={item?.models?.map((filePath: string) => [
                  <Text default key={`model-${filePath}`} monospace small>
                    {filePath}
                  </Text>
                ])}
              />
            </AccordionPanel>
          );
        })}
      </Accordion>
    );
  }

  return (
    <>
    </>
  );
}

export default GroupsOfBlocks;
