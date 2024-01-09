import BlockType from '@interfaces/BlockType';
import CacheItemType, { CacheItemTypeEnum } from '@interfaces/CacheItemType';
import DependencyGraph from '@components/DependencyGraph';
import api from '@api';
import { CONFIG_KEY_DBT_PROJECT_NAME } from '@interfaces/ChartBlockType';
import { UNIT } from '@oracle/styles/units/spacing';

type LineageProps = {
  block: BlockType;
}

function Lineage({
  block,
}: LineageProps) {
  const configuration = block?.configuration || {};
  const filePath = configuration?.file_path || configuration?.file_source?.path;
  const requestQuery = {
    item_type: CacheItemTypeEnum.DBT,
    project_path: configuration?.[CONFIG_KEY_DBT_PROJECT_NAME],
  };

  const { data: dataDetail } = api.cache_items.detail(
    encodeURIComponent(filePath),
    requestQuery,
    {
      pauseFetch: !configuration?.[CONFIG_KEY_DBT_PROJECT_NAME]?.length,
    });
  const itemDetail: CacheItemType = dataDetail?.cache_item;

  const upstreamBlocks: BlockType[] = itemDetail?.item?.upstream_blocks || [];

  return (
    <>
      {upstreamBlocks?.length >= 1 && (
        <DependencyGraph
          disabled
          enablePorts={false}
          height={UNIT * 80}
          pannable
          pipeline={{
            blocks: upstreamBlocks,
            uuid: null,
          }}
          zoomable
        />
      )}
    </>
  );
}

export default Lineage;
