import { useMemo } from 'react';
import { useRouter } from 'next/router';

import CustomDesignType from '@interfaces/CustomDesignType';
import { ClientPageTypeEnum } from '@interfaces/ClientPageType';
import { OperationTypeEnum } from '@interfaces/PageComponentType';
import api from '@api';
import { selectEntriesWithValues } from '@utils/hash';

type CustomDesignHookOptionsType = {
  operation?: OperationTypeEnum;
  pageType?: ClientPageTypeEnum;
  pageUUID?: string;
  resource?: string;
  resourceID?: string;
  resourceParent?: string;
  resourceParentID?: string;
};

function useCustomDesign(opts?: CustomDesignHookOptionsType): {
  design?: CustomDesignType;
  fetchDesign: () => void;
  router: any;
  routerDetails: {
    asPath: string;
    pathname: string;
    query?: {
      [key: string]: string | string[];
    };
  };
} {
  const {
    operation,
    pageType,
    pageUUID,
    resource,
    resourceID,
    resourceParent,
    resourceParentID,
  } = opts || {
    operation: null,
    pageType: null,
    pageUUID: null,
    resource: null,
    resourceID: null,
    resourceParent: null,
    resourceParentID: null,
  };


  const regex = /^\/{1}/i;
  const router = useRouter();
  const asPath = router?.asPath;
  const pathname = router?.pathname?.replace(regex, '');
  const query = router?.query;

  const { data, mutate } = api.custom_designs.detail(
    encodeURIComponent(pathname),
    selectEntriesWithValues({
      operation: operation,
      page_path: asPath,
      page_query: query ? JSON.stringify(query || '') : null,
      page_type: pageType,
      page_uuid: pageUUID,
      resource: resource,
      resource_id: resourceID,
      resource_parent: resourceParent,
      resource_parent_id: resourceParentID,
    }),
  );
  const design = useMemo(() => data?.custom_design || [], [data]);

  return {
    design,
    fetchDesign: mutate,
    router,
    routerDetails: {
      asPath,
      pathname,
      query,
    },
  };
}

export default useCustomDesign;
