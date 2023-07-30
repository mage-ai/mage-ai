import NextLink from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/router';

import Dashboard from '@components/Dashboard';
import GlobalDataProductType, {
  GlobalDataProductObjectTypeEnum,
} from '@interfaces/GlobalDataProductType';
import Link from '@oracle/elements/Link';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { pauseEvent } from '@utils/events';

function GlobalDataProducts() {
  const router = useRouter();

  const { data: dataGlobalProducts } = api.global_data_products.list();
  const globalDataProducts: GlobalDataProductType[] =
    useMemo(() => dataGlobalProducts?.global_data_products || [], [dataGlobalProducts]);

  return (
    <Dashboard
      title="Global data products"
      uuid="GlobalDataProducts/index"
    >
      <Table
        columnFlex={[1, null, null]}
        columns={[
          {
            uuid: 'UUID',
          },
          {
            uuid: 'Object type',
          },
          {
            uuid: 'Object UUID',
          },
        ]}
        onClickRow={(rowIndex: number) => {
          const gdp = globalDataProducts?.[rowIndex];
          if (gdp) {
            router.push(
              '/global-data-products/[...slug]',
              `/global-data-products/${gdp?.uuid}`,
            );
          }
        }}
        rows={globalDataProducts?.map((globalDataProduct: GlobalDataProductType) => {
          const {
            object_type: objectType,
            object_uuid: objectUUID,
            uuid,
          } = globalDataProduct;
          const linkProps: {
            as?: string;
            href?: string;
          } = {
            as: null,
            href: null,
          };

          if (GlobalDataProductObjectTypeEnum.PIPELINE === objectType) {
            linkProps.as = `/pipelines/${objectUUID}/edit`;
            linkProps.href = '/pipelines/[pipeline]/edit';
          }

          return [
            <Text key="uuid" monospace>
              {uuid}
            </Text>,
            <Text default key="objectType" monospace>
              {objectType}
            </Text>,
            <NextLink
              {...linkProps}
              key="objectUUID"
              passHref
            >
              <Link
                default
                monospace
                onClick={(e) => {
                  pauseEvent(e);
                  router.push(
                    linkProps.href,
                    linkProps.as,
                  );
                }}
                preventDefault
              >
                {objectUUID}
              </Link>
            </NextLink>,
          ];
        })}
        uuid="global-data-products"
      />
    </Dashboard>
  );
}

export default GlobalDataProducts;
