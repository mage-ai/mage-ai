import * as osPath from 'path';
import { useMemo } from 'react';

import CacheItemType, { CacheItemTypeEnum } from '@interfaces/CacheItemType';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { ALL_BLOCK_TYPES, BlockTypeEnum } from '@interfaces/BlockType';
import { FolderOutline, List } from '@oracle/icons';
import { NavLinkType } from '@components/CustomTemplates/BrowseTemplates/constants';
import { NavLinkUUIDEnum } from '../FileBrowserNavigation/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { sortByKey } from '@utils/array';

type BlocksDetailsProps = {
  cacheItems: CacheItemType[];
  selectedLinks?: NavLinkType[];
};

function BlocksDetails({
  cacheItems,
  selectedLinks,
}: BlocksDetailsProps) {
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

  if (BlockTypeEnum.DBT === selectedBlockType && selectedItem) {
    const {
      models,
      profiles,
      project,
    } = selectedItem?.item;
    const outputs =
      sortByKey(Object.entries(profiles?.[project?.profile]?.outputs || {}), tup => tup[0]);
    const modelPaths = project?.['model-paths'] || [];
    const projectFilePathParts = project?.file_path?.split(osPath.sep) || [];
    const projectFilePathPartsCount = projectFilePathParts?.length || 0;

    return (
      <>
        <Spacing p={PADDING_UNITS}>
          <Headline level={5}>
            Project
          </Headline>
        </Spacing>

        <Divider light short />

        <Spacing p={PADDING_UNITS}>
          {projectFilePathParts?.map((filePath: string, idx: number) => {
            const last = idx === projectFilePathPartsCount - 1;
            const Icon = last ? List : FolderOutline;

            return (
              <Spacing key={filePath} ml={idx * 2}>
                <FlexContainer alignItems="center">
                  <Icon default={last} muted={!last} />

                  <Spacing mr={1} />

                  <Text default={last} monospace muted={!last} small>
                    {filePath}
                  </Text>
                </FlexContainer>
              </Spacing>
            );
          })}
        </Spacing>

        <Divider light />

        <Table
          columnFlex={[null, null]}
          columns={[
            {
              label: () => 'Detail',
              uuid: 'details',
            },
            {
              label: () => '',
              rightAligned: true,
              uuid: 'value',
            },
          ]}
          noHeader
          rows={[
            [
              <Text default monospace small>
                Name
              </Text>,
              <Text monospace rightAligned small>
                {project?.name}
              </Text>,
            ],
            [
              <Text default monospace small>
                Models paths
              </Text>,
              <Text monospace rightAligned small>
                {modelPaths?.join(', ')}
              </Text>,
            ],
            [
              <Text default monospace small>
                Models
              </Text>,
              <Text monospace rightAligned small>
                {models?.length || 0}
              </Text>,
            ],
          ]}
        />

        <Spacing p={PADDING_UNITS}>
          <Headline level={5}>
            Profiles
          </Headline>
        </Spacing>

        <Divider light short />

        <Spacing p={PADDING_UNITS}>
          {profiles?.file_path?.split(osPath.sep)?.map((filePath: string, idx: number) => {
            const last = idx === projectFilePathPartsCount - 1;
            const Icon = last ? List : FolderOutline;

            return (
              <Spacing key={filePath} ml={idx * 2}>
                <FlexContainer alignItems="center">
                  <Icon default={last} muted={!last} />

                  <Spacing mr={1} />

                  <Text default={last} monospace muted={!last} small>
                    {filePath}
                  </Text>
                </FlexContainer>
              </Spacing>
            );
          })}
        </Spacing>

        <Divider light />

        <Table
          columnFlex={[null, null]}
          columns={[
            {
              uuid: 'Targets',
            },
            {
              rightAligned: true,
              uuid: 'Type',
            },
          ]}
          rows={outputs?.map(([targetName, target]) => [
            <Text default key={`target-${targetName}`} monospace small>
              {targetName}
            </Text>,
            <Text key={`type-${target?.type}`} monospace rightAligned small>
              {target?.type}
            </Text>,
          ])}
        />
      </>
    );
  }

  return (
    <>
    </>
  );
}

export default BlocksDetails;
