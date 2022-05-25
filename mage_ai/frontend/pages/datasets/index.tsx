import type { NextPage } from 'next'
import RowDataTable from '@oracle/components/RowDataTable'
import RowCard from '@oracle/components/RowCard'
import Text from '@oracle/elements/Text'
import FlexContainer from '@oracle/components/FlexContainer'
import { Copy } from '@oracle/icons'
import Tab from '@oracle/components/Tabs/Tab'
import Layout from '@oracle/components/Layout'
import Tabs from '@oracle/components/Tabs'
import Spacing from '@oracle/elements/Spacing'

const data = [
  {
     "id":"0",
     "metadata":{
        "name":"test_data_2",
        "pipeline_id":6,
        "statistics": {
           "count": 100, // row count
           "quality": "Good", // "Good", "Bad" 
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
  <Layout centerAlign>
    <Tabs defaultKey="datasets" bold>
      <Tab key="datasets" label="Datasets">
        <Spacing pb={3} pt={3}>
          <RowDataTable
            headerTitle="datasets"
            headerDetails={
              (data.length + ' dataset')
              + (data.length !== 1 ? 's' : '')
            }
          >
          {
            data.length
              ?
              data.map(n => (
                <RowCard key={n.id} columnFlexNumbers={[4, 1, 1, 1]}>
                  <FlexContainer alignItems="center">
                    <Copy primary />&nbsp;
                    <Text>{n.metadata.name}</Text>
                  </FlexContainer>
                  <Text>
                    {Object.keys(n.metadata.column_types).length} features
                  </Text>
                  <Text>
                    {n.metadata.statistics.count} rows
                  </Text>
                  <Text bold danger={
                    ["Bad","Worse","Worst"].includes(n.metadata.statistics.quality)
                  }>
                    {n.metadata.statistics.quality}
                  </Text>
                </RowCard>
              ))
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
