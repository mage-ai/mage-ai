import { useEffect, useMemo, useState } from 'react';

import api from '@api';
import { META_QUERY_KEYS, MetaQueryEnum } from '@api/constants';
import Dashboard from '@components/Dashboard';
import Secrets, { COLUMN_KEY_MAP, SORTABLE_COLUMN_INDEXES } from '@components/Secrets';
import SecretDetail from '@components/Secrets/SecretDetail';
import Paginate, { MAX_PAGES, ROW_LIMIT } from '@components/shared/Paginate';
import PrivateRoute from '@components/shared/PrivateRoute';
import { SortedColumnType } from '@components/shared/Table';
import { SortDirectionEnum, SortQueryEnum } from '@components/shared/Table/constants';
import FlexContainer from '@oracle/components/FlexContainer';
import Button from '@oracle/elements/Button';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Add } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { range, sortByKey } from '@utils/array';
import { isEmptyObject } from '@utils/hash';
import { goToWithQuery } from '@utils/routing';
import { filterQuery, queryFromUrl } from '@utils/url';

function SecretsPage() {
  const [showSecretDetail, setShowSecretDetail] = useState<boolean>(false);

  const urlQuery = queryFromUrl();
  const query = useMemo(() => ({
    ...filterQuery(urlQuery, [...META_QUERY_KEYS, SortQueryEnum.SORT_COL_IDX, SortQueryEnum.SORT_DIRECTION]),
  }) , [urlQuery]);

  const sortColumnIndexQuery = urlQuery?.[SortQueryEnum.SORT_COL_IDX];
  const sortDirectionQuery = urlQuery?.[SortQueryEnum.SORT_DIRECTION];
  const sortedColumnInit: SortedColumnType = useMemo(() => (sortColumnIndexQuery
    ?
    {
      columnIndex: +sortColumnIndexQuery,
      sortDirection: sortDirectionQuery || SortDirectionEnum.ASC,
    }
    : undefined
  ), [sortColumnIndexQuery, sortDirectionQuery]);

  const { data: dataSecrets, mutate: fetchSecrets } = api.secrets.list(query, {
    revalidateOnFocus: false,
  });

  const secrets = useMemo(() => {
    const arr = dataSecrets?.secrets || [];
    if (sortedColumnInit) {
      const { columnIndex, sortDirection } = sortedColumnInit;

      if (SORTABLE_COLUMN_INDEXES.includes(columnIndex)) {
        return sortByKey(arr, COLUMN_KEY_MAP[columnIndex], {
          ascending: sortDirection === SortDirectionEnum.ASC,
        });
      }
    }
    return arr;
  }, [dataSecrets, sortedColumnInit]);

  useEffect(() => {
    if (isEmptyObject(urlQuery)) {
      goToWithQuery({
        [MetaQueryEnum.LIMIT]: ROW_LIMIT,
        [MetaQueryEnum.OFFSET]: 0,
        [SortQueryEnum.SORT_COL_IDX]: SORTABLE_COLUMN_INDEXES[0],
        [SortQueryEnum.SORT_DIRECTION]: SortDirectionEnum.ASC,
      }, {
        pushHistory: false,
      });
    }
  }, [urlQuery]);

  const limitMemo = useMemo(() => {
    const limit = query?.[MetaQueryEnum.LIMIT];

    return (
      <FlexContainer alignItems="center">
        <Text muted small>
          Per page
        </Text>

        <Spacing mr={1} />

        <Select
          compact
          onChange={e => goToWithQuery({
            [MetaQueryEnum.LIMIT]: e.target.value,
            [MetaQueryEnum.OFFSET]: 0,
          }, {
            pushHistory: true,
          })}
          small
          value={limit}
        >
          {limit && ((limit > (5 * ROW_LIMIT)) || (limit % ROW_LIMIT)) && (
            <option value={limit}>
              {limit}
            </option>
          )}
          {range(5).map((i, idx) => {
            const val = (idx + 1) * ROW_LIMIT;

            return (
              <option key={val} value={val}>
                {val}
              </option>
            );
          })}
        </Select>
      </FlexContainer>
    );
  }, [
    query,
  ]);

  const paginateMemo = useMemo(() => {
    const count = dataSecrets?.metadata?.count || 0;
    const offset = query?.[MetaQueryEnum.OFFSET] || 0;
    const limit = query?.[MetaQueryEnum.LIMIT] || ROW_LIMIT;
    const totalPages = Math.ceil(count / limit);

    return (
      <Spacing p={PADDING_UNITS}>
        <Paginate
          maxPages={MAX_PAGES}
          onUpdate={(p) => {
            const newPage = Number(p);
            goToWithQuery({
              [MetaQueryEnum.OFFSET]: newPage * limit,
            });
          }}
          page={Math.floor(offset / limit)}
          totalPages={totalPages}
        />
      </Spacing>
    );
  }, [dataSecrets, query]);


  return (
    <Dashboard
      before={showSecretDetail && (
        <SecretDetail
          onClose={() => setShowSecretDetail(false)}
          onSaveSuccess={() => fetchSecrets()}
        />
      )}
      beforeWidth={40 * UNIT}
      subheaderChildren={(
        <FlexContainer justifyContent="space-between">
          <Spacing pr={PADDING_UNITS}>
            <Button
                beforeIcon={<Add size={UNIT * 2.5} />}
                onClick={() => setShowSecretDetail(true)}
                primary
              >
              New secret
            </Button>
          </Spacing>
          {limitMemo}
        </FlexContainer>
    )}
      title="Secrets"
      uuid="Secrets/index"
    >
      <Secrets
        fetchSecrets={fetchSecrets}
        secrets={secrets}
        sortedColumn={sortedColumnInit}
      />

      {paginateMemo}
    </Dashboard>
  );
}

SecretsPage.getInitialProps = async () => ({});

export default PrivateRoute(SecretsPage);
