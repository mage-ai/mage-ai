import Router from 'next/router'
import type { NextPage } from 'next'
import { useEffect, useMemo, useState } from 'react'

import FlexContainer from '@oracle/components/FlexContainer'
import Layout from '@oracle/components/Layout'
import Link from '@oracle/elements/Link'
import RowCard from '@oracle/components/RowCard'
import RowDataTable from '@oracle/components/RowDataTable'
import Spacing from '@oracle/elements/Spacing'
import Tab from '@oracle/components/Tabs/Tab'
import Tabs from '@oracle/components/Tabs'
import Text from '@oracle/elements/Text'
import api from '@api'
import { File } from '@oracle/icons'
import { UNIT } from '@oracle/styles/units/spacing'
import { isBadQuality } from '@components/utils'
import { pluralize } from '@utils/string'


const Dashboard: NextPage = () => {
  const { data: featureSetsData } = api.feature_sets.list();
  const featureSetsMemo = useMemo(() => featureSetsData, [
    featureSetsData,
  ]);

  const [featureSets, setFeatureSets] = useState([]);
  useEffect(() => setFeatureSets(featureSetsMemo), [
    featureSetsMemo,
  ]);

  return (
    <Layout
      centerAlign
      header={<Spacing mt={UNIT} />}
    >
      <Tabs defaultKey="datasets" bold large>
        <Tab key="datasets" label="Datasets">
          <Spacing pb={3} pt={3}>
            <RowDataTable
              headerTitle="datasets"
              headerDetails={pluralize("dataset", featureSets?.length)}
            >
              {
              featureSets?.length > 0
                ?
                featureSets?.map(dataset => {
                  const {
                    id,
                    metadata: {
                      column_types,
                      name,
                      statistics: {
                        count,
                        quality,
                      },
                    },
                  } = dataset;

                  const num_features = Object.keys(column_types).length;

                  return (
                    <RowCard
                      key={id}
                      columnFlexNumbers={[4, 1, 1, 1]}
                    >
                      <FlexContainer alignItems="center">
                        <File secondary />
                        <Spacing mr={1} />
                        <Link
                          noHoverUnderline
                          onClick={() => Router.push(`datasets/${id}`)}
                          sameColorAsText
                        >
                          {name}
                        </Link>
                      </FlexContainer>
                      <Text>{num_features} features</Text>
                      <Text>{count} rows</Text>
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
                    {/* TODO: add link to README or something here? */}
                    No datasets available. Add one to get started.
                  </Text>
                </Spacing>
              }
            </RowDataTable>
          </Spacing>
        </Tab>
      </Tabs>
    </Layout>
  )
};

export default Dashboard
