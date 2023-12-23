import { useEffect, useMemo, useRef, useState } from 'react';

import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import CacheItemType, { CacheItemTypeEnum } from '@interfaces/CacheItemType';
import CodeEditor from '@components/CodeEditor';
import DependencyGraph from '@components/DependencyGraph';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
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
import { buildNavLinks, buildNavLinkModels, handleNextSelectedLinks } from '../FileBrowserNavigation/utils';

type BlockDetailProps = {
  cacheItem: CacheItemType;
  cacheItems: CacheItemType;
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

function BlockDetail({
  cacheItem,
  cacheItems,
  mainContainerHeight,
  onClickAction,
  selectedLinks,
  setSelectedLinks,
}: BlockDetailProps) {
  const refHeader = useRef(null);
  const [headerHeight, setHeaderHeight] = useState<number>(null);
  const [selectedTab, setSelectedTab] = useState<TabType>(null);

  const selectedLink = selectedLinks?.[0];
  const item = useMemo(() => cacheItem?.item, [cacheItem]);
  const models = useMemo(() => buildModels(item), [
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

  const { data: dataDetail } = api.cache_items.detail(
    encodeURIComponent(model?.fullPath),
    {
      item_type: CacheItemTypeEnum.DBT,
      project_path: item?.project?.uuid,
    },
  );
  const itemDetail: CacheItemType = useMemo(() => dataDetail?.cache_item, [dataDetail]);

  const upstreamBlocks: BlockType[] = useMemo(() => itemDetail?.item?.upstream_blocks || [], [
    itemDetail,
  ]);
  const upstreamBlocksWithoutCurrent = useMemo(() => upstreamBlocks?.filter(({
    configuration,
  }) => configuration?.file_path !== model?.fullPath && configuration?.file_source?.path !== model?.fullPath), [
    model,
    upstreamBlocks,
  ]);

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

  useEffect(() => {
    setTimeout(() => setHeaderHeight(refHeader?.current?.getBoundingClientRect()?.height), 1);
  }, []);

  if (CacheItemTypeEnum.DBT === cacheItem?.item_type) {
    return (
      <>
        <div ref={refHeader}>
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
        </div>

        {TabEnum.OVERVIEW === selectedTab?.uuid && (
          <>
            <Spacing p={PADDING_UNITS}>
              <Headline level={5}>
                Info
              </Headline>
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
                  <Headline level={5}>
                    Schema
                  </Headline>
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

            {upstreamBlocksWithoutCurrent?.length >= 1 && (
              <>
                <Spacing p={PADDING_UNITS}>
                  <Headline level={5}>
                    Upstream model dependencies
                  </Headline>
                </Spacing>

                <Divider light short />

                <Table
                  columnFlex={[1, 1, 1, null]}
                  columns={[
                    {
                      uuid: 'Name',
                    },
                    {
                      uuid: 'Model file',
                    },
                    {
                      uuid: 'Directory',
                    },
                    {
                      rightAligned: true,
                      uuid: 'Project',
                    },
                  ]}
                  onClickRow={(rowIndex: number) => {
                    const block = upstreamBlocksWithoutCurrent?.[rowIndex];
                    const configuration = block?.configuration;
                    const cacheItem2 = cacheItems?.find(({
                      uuid,
                    }) => uuid === configuration?.file_source?.project_path);

                    const models = buildModels({
                      ...(cacheItem2?.item || {}),
                      models: [
                        configuration?.file_path || configuration?.file_source?.path,
                      ],
                    });
                    const row = models?.[0];

                    const value = buildNavLinkModels([row])?.[0];

                    return setSelectedLinks(prev => handleNextSelectedLinks(
                      value,
                      prev,
                      cacheItems,
                    ));
                  }}
                  rows={upstreamBlocksWithoutCurrent?.map((block) => {
                    const {
                      configuration,
                      uuid: blockUUID,
                    } = block;
                    const model = buildModels({
                      ...(item || {}),
                      models: [
                        configuration?.file_path || configuration?.file_source?.path,
                      ],
                    })?.[0];

                    return [
                      <Text key={`model-${blockUUID}`} monospace dbt small>
                        {model?.name || blockUUID}
                      </Text>,
                      <Text default key={`model-file-${blockUUID}`} monospace small>
                        {model?.filePath || configuration?.file_path || configuration?.file_source?.path}
                      </Text>,
                      <Text default key={`model-directory-${blockUUID}`} monospace small>
                        {model?.directory}
                      </Text>,

                      <Text default key={`project-${blockUUID}`} monospace rightAligned small>
                        {configuration?.file_source?.project_path}
                      </Text>,
                    ];
                  })}
                />
              </>
            )}

            <Spacing p={PADDING_UNITS}>
              <Headline level={5}>
                Code
              </Headline>
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
              language={FILE_EXTENSION_TO_LANGUAGE_MAPPING[model?.fileExtension]}
              padding={UNIT * 2}
              readOnly
              value={fileContent?.content}
            />
          </>
        )}

        {TabEnum.LINEAGE === selectedTab?.uuid && (
          <>
            {upstreamBlocks?.length >= 1 && (
              <DependencyGraph
                disabled
                enablePorts={false}
                height={Math.max(mainContainerHeight, UNIT * 50)}
                heightOffset={headerHeight}
                pannable
                pipeline={{
                  blocks: upstreamBlocks,
                }}
                zoomable
              />
            )}
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

        {TabEnum.CODE === selectedTab?.uuid && (
          <>
            {itemDetail?.item?.content_compiled && (
              <CodeEditor
                autoHeight
                language={FILE_EXTENSION_TO_LANGUAGE_MAPPING[model?.fileExtension]}
                padding={UNIT * 2}
                readOnly
                value={itemDetail?.item?.content_compiled}
              />
            )}
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
