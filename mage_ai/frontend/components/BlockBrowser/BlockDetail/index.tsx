import { useEffect, useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import CacheItemType, { CacheItemTypeEnum } from '@interfaces/CacheItemType';
import CodeEditor from '@components/CodeEditor';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { DBT } from '@oracle/icons';
import { FILE_EXTENSION_TO_LANGUAGE_MAPPING } from '@interfaces/FileType';
import { NavLinkType } from '@components/CustomTemplates/BrowseTemplates/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { TABS, TabEnum } from './constants';
import { buildModels } from '../utils';

type BlockDetailProps = {
  cacheItem: CacheItemType;
  onClickAction?: (opts?: {
    cacheItem: CacheItemType;
    row?: {
      directory?: string;
      filePath?: string;
      name?: string;
    };
  }) => void;
  selectedLinks?: NavLinkType[];
};

function BlockDetail({
  cacheItem,
  onClickAction,
  selectedLinks,
}: BlockDetailProps) {
  const [selectedTab, setSelectedTab] = useState<TabType>(null);

  const selectedLink = selectedLinks?.[0];
  const item = useMemo(() => cacheItem?.item, [cacheItem]);
  const models = useMemo(() => buildModels(item?.project, item?.models), [
    item,
  ]);
  const model = useMemo(() => models?.find(({ filePath }) => filePath === selectedLink?.uuid), [
    models,
    selectedLink,
  ]);

  const { data } = api.file_contents.detail(encodeURIComponent(model?.fullPath));
  const fileContent: {
    content: string;
  } = useMemo(() => data?.file_content, [data]);

  useEffect(() => {
    setSelectedTab(prev => prev ? prev : TABS?.[0]);
  }, []);

  const modelSchema = useMemo(() => {
    let schemaDetails;

    const schema = item?.schema?.find(({
      models: arr,
    }) => arr?.find((schemaInner) => {
      if (schemaInner?.name === model?.name) {
        schemaDetails = schemaInner;

        return schemaDetails;
      }
    }));

    return {
      schema,
      schemaDetails,
    };
  }, [
    item,
    model,
  ]);

  if (CacheItemTypeEnum.DBT === cacheItem?.item_type) {
    return (
      <>
        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center" justifyContent="space-between">
            <Flex alignItems="center" flex={1}>
              <DBT size={UNIT * 2.5} />

              <Spacing mr={PADDING_UNITS} />

              <FlexContainer flexDirection="column">
                <Text large monospace>
                  {model?.name}
                </Text>

                {modelSchema?.schemaDetails?.description && (
                  <div style={{ marginTop: 2 }}>
                    <Text muted>
                      {modelSchema?.schemaDetails?.description}
                    </Text>
                  </div>
                )}
              </FlexContainer>
            </Flex>

            {onClickAction && (
              <Button
                onClick={() => {
                  return onClickAction({
                    cacheItem,
                    row: model,
                  });
                }}
                primary
              >
                Add to pipeline
              </Button>
            )}
          </FlexContainer>
        </Spacing>

        <ButtonTabs
          large
          onClickTab={tab => setSelectedTab?.(tab)}
          selectedTabUUID={selectedTab?.uuid}
          tabs={TABS}
          underlineStyle
        />

        <Divider light />

        {TabEnum.OVERVIEW === selectedTab?.uuid && (
          <>
            <Spacing p={PADDING_UNITS}>
              <Text bold large>
                Info
              </Text>
            </Spacing>

            <Divider light short />

            <Table
              columnFlex={[null, 1]}
              columns={[
                {
                  label: () => 'Info',
                  uuid: 'details',
                },
                {
                  label: () => '',
                  uuid: 'value',
                },
              ]}
              noHeader
              rows={[
                [
                  <Text default monospace small>
                    Model file
                  </Text>,
                  <Text monospace small>
                    {model?.filePath}
                  </Text>,
                ],
                [
                  <Text default monospace small>
                    Directory
                  </Text>,
                  <Text monospace small>
                    {model?.directory}
                  </Text>,
                ],
                // @ts-ignore
              ].concat(modelSchema?.schema?.file_path
                ? [
                  [
                    <Text default monospace small>
                      Schema file
                    </Text>,
                    <Text monospace small>
                      {modelSchema?.schema?.file_path}
                    </Text>,
                  ],
                ]
                : []
              )}
            />

            {modelSchema?.schemaDetails?.columns?.length >= 1 && (
              <>
                <Spacing p={PADDING_UNITS}>
                  <Text bold large>
                    Schema
                  </Text>
                </Spacing>

                <Divider light short />

                <Table
                  columnFlex={[null, 1]}
                  columns={[
                    {
                      uuid: 'Column',
                    },
                    {
                      uuid: 'Description',
                    },
                  ]}
                  rows={modelSchema?.schemaDetails?.columns?.map(({
                    description,
                    name,
                  }) => [
                    <Text key={`name-${name}`} monospace small>
                      {name}
                    </Text>,
                    <Text default key={`description-${description}`} monospace small>
                      {description}
                    </Text>,
                  ])}
                />
              </>
            )}

            <Spacing p={PADDING_UNITS}>
              <Text bold large>
                Code
              </Text>
            </Spacing>

            <Divider light short />

            <Table
              columnFlex={[null, 1]}
              columns={[
                {
                  label: () => 'Info',
                  uuid: 'details',
                },
                {
                  label: () => '',
                  uuid: 'value',
                },
              ]}
              noHeader
              rows={[
                [
                  <Text default monospace small>
                    File
                  </Text>,
                  <Text monospace small>
                    {model?.fullPath}
                  </Text>,
                ],
              ]}
            />

            <CodeEditor
              autoHeight
              language={FILE_EXTENSION_TO_LANGUAGE_MAPPING[models?.fileExtension]}
              padding={UNIT * 2}
              readOnly
              value={fileContent?.content}
            />
          </>
        )}

        {TabEnum.LINEAGE === selectedTab?.uuid && (
          <>
          </>
        )}

        {TabEnum.DATA === selectedTab?.uuid && (
          <>
          </>
        )}

        {TabEnum.PIPELINES === selectedTab?.uuid && (
          <>
          </>
        )}
      </>
    );
  }
  return (
    <div />
  );
}

export default BlockDetail;
