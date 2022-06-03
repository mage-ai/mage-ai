import NextLink from 'next/link';
import Router from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Layout from '@oracle/components/Layout';
import Link from '@oracle/elements/Link';
import PageBreadcrumbs from '@components/PageBreadcrumbs';
import RowCard from '@oracle/components/RowCard';
import RowDataTable from '@oracle/components/RowDataTable';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import { Column } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { getFeatureIdMapping } from '@utils/models/featureSet';
import { isBadQuality } from '@components/utils';

const ColumnList = ({ featureSetId }) => {
  const viewDataset = () => Router.push(`/datasets/${featureSetId}`);

  const { data: featureSetData } = api.feature_sets.detail(featureSetId);
  const featureSetMemo = useMemo(() => featureSetData, [
    featureSetData,
  ]);

  const [featureSet, setFeatureSet] = useState<any>({
    id: featureSetId,
    metadata: {
      column_types: {},
    },
    statistics: {},
  });

  useEffect(() => setFeatureSet(featureSetMemo), [
    featureSetMemo,
  ]);

  const featureIdMapping = getFeatureIdMapping(featureSet);
  const columnTypes = Object.entries(featureSet?.metadata?.column_types || {});

  const headEl = (
    <FlexContainer alignItems="center" justifyContent="space-between">
      <PageBreadcrumbs featureSet={featureSet} />
      <Button onClick={viewDataset}>
        <Text bold> Dataset view </Text>
      </Button>
    </FlexContainer>
  );

  return (
    <Layout
      centerAlign
      header={<Spacing mt={UNIT} />}
    >
      {headEl}
      <Spacing pt={3}>
        <RowDataTable
          headerTitle="columns"
        >
          {
            columnTypes.map(([colName, colType], i) => {
              const quality = featureSet.statistics[`${colName}/quality`];
              const featureId = featureIdMapping[colName];

              return (
                <NextLink
                  as={`/datasets/${featureSetId}/features/${featureId}`}
                  href="/datasets/[...slug]"
                  key={`${colName}_${i}`}
                  passHref
                >
                  <Link
                    block
                    key={`${colName}-${i}`}
                    noHoverUnderline
                    noOutline
                  >
                    <RowCard
                      columnFlexNumbers={[0.5, 0.2, 9, 2, 1]}
                      last={i === columnTypes.length - 1}
                      noHorizontalPadding
                      secondary={i % 2 === 1}
                    >
                      <FlexContainer fullWidth justifyContent="center">
                        <Text>{i+1}</Text>
                      </FlexContainer>

                      <Column secondary />

                      <Text maxWidth={UNIT * 50} overflowWrap>
                        {colName}
                      </Text>

                      <Text maxWidth={UNIT * 20}>
                        {colType}
                      </Text>

                      <Text
                        bold={isBadQuality(quality)}
                        danger={isBadQuality(quality)}
                      >
                        {quality}
                      </Text>
                    </RowCard>
                  </Link>
                </NextLink>
              );
            })
          }
        </RowDataTable>
      </Spacing>
    </Layout>
  );
};

export default ColumnList;
