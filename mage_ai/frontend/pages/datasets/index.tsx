import Router from 'next/router'
import type { NextPage } from 'next'

import FlexContainer from '@oracle/components/FlexContainer'
import Layout from '@oracle/components/Layout'
import Link from '@oracle/elements/Link'
import RowCard from '@oracle/components/RowCard'
import RowDataTable from '@oracle/components/RowDataTable'
import Spacing from '@oracle/elements/Spacing'
import Tab from '@oracle/components/Tabs/Tab'
import Tabs from '@oracle/components/Tabs'
import Text from '@oracle/elements/Text'
import { File } from '@oracle/icons'
import { isBadQuality } from '@components/utils'
import { pluralize } from '@utils/string'

// TODO replace with API call to backend
const data = [
  {
     "id":"0",
     "metadata":{
        "name":"test_data_2",
        "pipeline_id": 6,
        "statistics": {
           "count": 100,
           "quality": "Good",
        },
        "column_types":{
           "order_id":"category",
           "price_unit":"category",
           "price_subtotal_incl":"category",
           "price_subtotal":"category",
           "product_id":"category",
           "attribute_ids":"category",
           "display_name":"category",
           "qty":"category",
           "default_code":"category",
           "location_id":"category",
           "create_date":"datetime",
           "write_date":"datetime",
           "xStudioFieldK5gaz":"number_with_decimals",
           "x_studio_UPC_Individual":"number_with_decimals",
           "lines_id":"text"
        }
     }
  }
];

const Dashboard: NextPage = () => (
  <Layout
    centerAlign
    header={<Spacing m={2} />}
  >
    <Tabs defaultKey="datasets" bold large>
      <Tab key="datasets" label="Datasets">
        <Spacing pb={3} pt={3}>
          <RowDataTable
            headerTitle="datasets"
            headerDetails={pluralize("dataset", data.length)}
          >
          {
            data.length > 0
              ?
              data.map(dataset => {

                const {
                  id,
                  metadata: {
                    column_types,
                    name,
                    statistics: {
                      count,
                      quality
                    }
                  }
                } = dataset;

                const num_features = Object.keys(column_types).length;

                return (
                  <RowCard
                    key={id}
                    columnFlexNumbers={[4, 1, 1, 1]}
                  >
                    <FlexContainer alignItems="center">
                      <File />&nbsp;
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
                      bold
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

export default Dashboard
