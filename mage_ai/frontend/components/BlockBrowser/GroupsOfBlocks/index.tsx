import * as osPath from 'path';
import { useMemo } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
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
import { pauseEvent } from '@utils/events';
import { sortByKey } from '@utils/array';

type GroupsOfBlocksProps = {
  cacheItems: CacheItemType[];
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
  onClickAction,
  selectedLinks,
  setSelectedLinks,
}: GroupsOfBlocksProps) {
  const selectedBlockType = useMemo(() => selectedLinks?.find(({
    uuid,
  }) => uuid in ALL_BLOCK_TYPES)?.uuid as BlockTypeEnum, [
    selectedLinks,
  ]);

  if (BlockTypeEnum.DBT === selectedBlockType) {
    const arr = sortByKey(cacheItems, ({ item }) => item?.project?.name).filter(({
      item,
    }) => [NavLinkUUIDEnum.ALL_PROJECTS, item?.project?.uuid].includes(selectedLinks?.[0]?.uuid));

    const buildTable = (cacheItem: CacheItemType) => {
      const {
        models: modelsInit,
        project,
      } = cacheItem?.item || {
        models: [],
        project: null,
      };

      const modelPaths = project?.['model-paths'] || [];
      const regexes = new RegExp(modelPaths?.map((modelPath: string) => [
        project?.uuid,
        modelPath,
        '',
      ].join(osPath.sep))?.join('|'));

      const models = sortByKey(modelsInit?.map((filePath: string) => {
        const modelPath = filePath.replace(regexes, '');
        const parts = modelPath?.split(osPath.sep);

        let modelName;
        let modelDirectory;

        if (parts?.length >= 2) {
          modelName = parts?.[parts?.length - 1];
          modelDirectory = parts?.slice(0, parts?.length - 1)?.join(osPath.sep);
        } else {
          modelName = parts?.[0];
        }

        const modelNameParts = modelName?.split('.');

        return {
          directory: modelDirectory,
          filePath: modelPath,
          name: modelNameParts?.slice(0, modelNameParts?.length - 1)?.join('.'),
        }
      }), ({ name }) => name);

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

              return setSelectedLinks(prev => [{
                label: () => (
                  <Text monospace>
                    {row?.name}
                  </Text>
                ),
                uuid: row?.filePath,
                // @ts-ignore
              }].concat(prev));
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

    if (NavLinkUUIDEnum.ALL_PROJECTS === selectedLinks?.[0]?.uuid) {
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
    }

    return buildTable(arr?.[0]);
  }

  return (
    <>
    </>
  );
}

export default GroupsOfBlocks;
