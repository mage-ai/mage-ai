import Router from 'next/router';
import type { NextPage } from 'next';

import FlexContainer from '@oracle/components/FlexContainer';
import Layout from '@oracle/components/Layout';
import light from '@oracle/styles/themes/light';
import Link from '@oracle/elements/Link';
import RowCard from '@oracle/components/RowCard';
import RowDataTable from '@oracle/components/RowDataTable';
import Spacing from '@oracle/elements/Spacing';
import Tab from '@oracle/components/Tabs/Tab';
import Tabs from '@oracle/components/Tabs';
import Text from '@oracle/elements/Text';
import api from '@api';
import { File } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { isBadQuality } from '@components/utils';
import { numberWithCommas, pluralize } from '@utils/string';
import { sortByKey } from '@utils/array';

const Dashboard: NextPage = () => {
  const { data: featureSetsData } = api.feature_sets.list();
  const featureSets = featureSetsData
    ? sortByKey(featureSetsData, ({ id }) => id, { ascending: false })
    : [];

  return (
    <Layout
      centerAlign
      header={<Spacing mt={UNIT} />}
      pageTitle="Dataset Dashboard"
    >
      <Spacing px={1}>
        <Tabs bold defaultKey="datasets" large>
          <Tab key="datasets" label="Datasets">
            <Spacing pb={3} pt={3}>
              <RowDataTable
                headerDetails={pluralize('dataset', featureSets?.length)}
                headerTitle="datasets"
              >
                {
                featureSets?.length > 0
                  ?
                  featureSets?.map((dataset, idx) => {
                    const {
                      id,
                      metadata,
                    } = dataset || {};
                    const {
                      column_types = {},
                      name = `dataset_${id}`,
                      statistics,
                    } = metadata || {};
                    const {
                      count,
                      quality,
                    } = statistics || {};

                    const num_features = column_types
                      ? Object.keys(column_types).length
                      : 0;

                    return (
                      <RowCard
                        columnFlexNumbers={[4, 1, 1, 1]}
                        key={id}
                        last={idx === featureSets.length - 1}
                      >
                        <FlexContainer alignItems="center">
                          <File secondary />
                          <Spacing mr={1} />
                          <Link
                            noHoverUnderline
                            onClick={() => Router.push(`datasets/${id}`)}
                            preventDefault
                            sameColorAsText
                          >
                            {name}
                          </Link>
                        </FlexContainer>
                        <Text>{numberWithCommas(num_features)} features</Text>
                        <Text>{numberWithCommas(count)} rows</Text>
                        <Text
                          bold={isBadQuality(quality)}
                          danger={isBadQuality(quality)}
                        >
                          {quality}
                        </Text>
                      </RowCard>
                    );
                  })
                  :
                  <Spacing p={2}>
                    <Text>
                      No datasets available. Add one to get started.
                    </Text>
                  </Spacing>
                }
              </RowDataTable>
            </Spacing>
          </Tab>
        </Tabs>
      </Spacing>
    </Layout>
  );
};

Dashboard.getInitialProps = async () => ({
  themeProps: {
    currentTheme: light,
  },
});

export default Dashboard;
