
import { useMemo } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import BlockDetail from '../BlockDetail';
import Button from '@oracle/elements/Button';
import CacheItemType, { CacheItemTypeEnum, DBTCacheItemType } from '@interfaces/CacheItemType';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { ALL_BLOCK_TYPES, BlockTypeEnum } from '@interfaces/BlockType';
import { NavLinkType } from '@components/CustomTemplates/BrowseTemplates/constants';
import { NavLinkUUIDEnum } from '../FileBrowserNavigation/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PaginateArrowRight } from '@oracle/icons';
import { buildModels } from '../utils';
import { buildNavLinks, handleNextSelectedLinks } from '../FileBrowserNavigation/utils';
import { pauseEvent } from '@utils/events';
import { sortByKey } from '@utils/array';

type GroupsOfBlocksProps = {
  cacheItems: CacheItemType[];
  mainContainerHeight?: number;
  onClickAction?: (opts?: {
    cacheItem: CacheItemType;
    row?: {
      directory?: string;
      filePath?: string;
      name?: string;
    };
  }) => void;
  selectedLinks?: NavLinkType[];
  setSelectedLinks: (value: NavLinkType[]) => void;
};

function GroupsOfBlocks({
  cacheItems,
  mainContainerHeight,
  onClickAction,
  selectedLinks,
  setSelectedLinks,
}: GroupsOfBlocksProps) {
  const selectedBlockType = useMemo(() => selectedLinks?.find(({
    uuid,
  }) => uuid in ALL_BLOCK_TYPES)?.uuid as BlockTypeEnum, [
    selectedLinks,
  ]);

  const selectedItem = useMemo(() => {
    const uuids = selectedLinks?.slice(0, 2)?.map(({ uuid }) => uuid);

    return cacheItems?.find(({
      item,
    }) => uuids?.includes(item?.project?.uuid));
  }, [
    cacheItems,
    selectedLinks,
  ]);

  if (BlockTypeEnum.DBT === selectedBlockType) {
    const arr = sortByKey(cacheItems || [], ({ item }) => item?.project?.name).filter(({
      item,
    }) => selectedLinks?.length === 1 || selectedLinks?.[0]?.uuid === item?.project?.uuid);

    const buildTable = (cacheItem: CacheItemType) => {
      const {
        models: modelsInit,
        project,
      } = cacheItem?.item || {
        models: [],
        project: null,
      };

      const models = buildModels({
        models: modelsInit,
        project,
      });

      return (
        <>
          <Spacing p={PADDING_UNITS}>
            <FlexContainer alignItems="center">
              <Text bold large>
                Models
              </Text>

              <Spacing mr={1} />

              <PaginateArrowRight muted />

              <Spacing mr={1} />

              <Text default large monospace>
                {models?.length || 0}
              </Text>
            </FlexContainer>
          </Spacing>

          <Divider light />

          <Table
            columnFlex={[null, 1, 1, null]}
            columns={[
              {
                uuid: 'Name',
              },
              {
                uuid: 'Directory',
              },
              {
                uuid: 'File',
              },
              {
                label: () => '',
                rightAligned: true,
                uuid: 'Action',
              },
            ]}
            onClickRow={(index: number) => {
              const row = models?.[index];

              const value = {
                label: () => (
                  <Text monospace>
                    {row?.name}
                  </Text>
                ),
                uuid: row?.filePath,
              };

              return setSelectedLinks(prev => handleNextSelectedLinks(value, prev, cacheItems));
            }}
            rows={models?.map((row) => {
              const {
                directory,
                filePath,
                name,
              } = row;

              return [
                <Text key={`model-${name}`} monospace small>
                  {name}
                </Text>,
                <Text default key={`model-${directory}`} monospace small>
                  {directory}
                </Text>,
                <Text default key={`model-${filePath}`} monospace small>
                  {filePath}
                </Text>,
                <FlexContainer justifyContent="flex-end">
                  <Button
                    compact
                    onClick={(e) => {
                      pauseEvent(e);

                      return onClickAction({
                        cacheItem,
                        row,
                      });
                    }}
                    secondary
                    small
                  >
                    Add to pipeline
                  </Button>
                </FlexContainer>
              ];
            })}
          />
        </>
      );
    };

    if (selectedLinks?.length === 1) {
      return (
        <Accordion
          noBorder
          noBoxShadow
          visibleMappingForced={arr?.reduce((acc, key, idx) => ({
            ...acc,
            [String(idx)]: true,
          }), {})}
        >
          {arr?.map((cacheItem) => {
            const {
              name,
              uuid,
            } = cacheItem?.item?.project || {
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
                {buildTable(cacheItem)}
              </AccordionPanel>
            );
          })}
        </Accordion>
      );
    } else if (selectedLinks?.length === 2) {
      return buildTable(arr?.[0]);
    } else if (selectedItem && selectedLinks?.length === 3) {
      return (
        <BlockDetail
          cacheItem={selectedItem}
          cacheItems={cacheItems}
          mainContainerHeight={mainContainerHeight}
          onClickAction={onClickAction}
          selectedLinks={selectedLinks}
          setSelectedLinks={setSelectedLinks}
        />
      );
    }
  }

  return (
    <>
    </>
  );
}

export default GroupsOfBlocks;
