import { createRef, useCallback, useMemo } from 'react';

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
import { FolderOutline, PaginateArrowRight } from '@oracle/icons';
import { buildModels } from '../utils';
import {
  buildNavLinks,
  buildNavLinkModels,
  handleNextSelectedLinks,
} from '../FileBrowserNavigation/utils';
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
  refCacheItems?: {
    [uuid: string]: any;
  };
  selectedItem?: CacheItemType;
  selectedLinks?: NavLinkType[];
  setSelectedLinks: (value: NavLinkType[]) => void;
};

function GroupsOfBlocks({
  cacheItems,
  mainContainerHeight,
  onClickAction,
  refCacheItems,
  selectedItem,
  selectedLinks,
  setSelectedLinks,
}: GroupsOfBlocksProps) {
  const selectedBlockType = useMemo(() => selectedLinks?.find(({
    uuid,
  }) => uuid in ALL_BLOCK_TYPES)?.uuid as BlockTypeEnum, [
    selectedLinks,
  ]);

  const arr = useMemo(() => sortByKey(cacheItems || [], ({ item }) => item?.project?.name).filter(({
    item,
  }) => selectedLinks?.length === 1 || selectedLinks?.[0]?.uuid === item?.project?.uuid), [
    cacheItems,
    selectedLinks,
  ]);

  const buildTable = useCallback((cacheItem: CacheItemType) => {
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
          buildRowProps={(rowIndex: number) => {
            const row = models?.[rowIndex];
            const ref3 = createRef();

            if (!(cacheItem?.uuid in refCacheItems?.current)) {
              refCacheItems.current[cacheItem?.uuid] = {};
            }

            refCacheItems.current[cacheItem?.uuid][row.fullPath] = ref3;

            return {
              rowProps: {
                id: row.fullPath,
                ref: ref3,
              },
            };
          }}
          columnFlex={[1, 1, 1, 1]}
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

            const value = buildNavLinkModels([row])?.[0];

            const navLink = buildNavLinks(cacheItems)?.find(({
              uuid,
            }) => uuid === row?.project?.uuid);

            // @ts-ignore
            return setSelectedLinks(prev => handleNextSelectedLinks([
              value,
              navLink,
            ], prev, cacheItems));
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
  }, [
    cacheItems,
    onClickAction,
    setSelectedLinks,
  ]);

  const allMemo = useMemo(() => {
    return (
      <Accordion
        noBorder
        noBoxShadow
        visibleMappingForced={cacheItems?.reduce((acc, key, idx) => ({
          ...acc,
          [String(idx)]: true,
        }), {})}
      >
        {cacheItems?.map((cacheItem) => {
          const {
            name,
            uuid,
          } = cacheItem?.item?.project || {
            name: null,
            uuid: null,
          };

          const ref2 = createRef();
          refCacheItems.current[cacheItem?.uuid] = {
            cacheItem: ref2,
          };

          return (
            <AccordionPanel
              key={uuid}
              id={cacheItem?.uuid}
              noBorderRadius
              noPaddingContent
              refContainer={ref2}
              title={(
                <FlexContainer alignItems="center">
                  <FolderOutline size={2 * UNIT} />

                  <Spacing mr={PADDING_UNITS} />

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
  }, [
    buildTable,
    cacheItems,
  ]);

  const singleMemo = useMemo(() => buildTable(arr?.[0]), [
    arr,
    buildTable,
  ]);

  const detailMemo = useMemo(() => (
    <BlockDetail
      cacheItem={selectedItem}
      cacheItems={cacheItems}
      mainContainerHeight={mainContainerHeight}
      onClickAction={onClickAction}
      selectedLinks={selectedLinks}
      setSelectedLinks={setSelectedLinks}
    />
  ), [
    cacheItems,
    mainContainerHeight,
    onClickAction,
    selectedItem,
    selectedLinks,
    setSelectedLinks,
  ]);

  return (
    <>
      {BlockTypeEnum.DBT === selectedBlockType && (
        <>
          {selectedLinks?.length === 1
            ? allMemo
            : selectedLinks?.length === 2
              ? singleMemo
              : detailMemo
          }
        </>
      )}
    </>
  );
}

export default GroupsOfBlocks;
