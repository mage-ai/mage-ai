import Router from 'next/router'
import type { NextPage } from 'next'

import Button from '@oracle/elements/Button'
import FlexContainer from '@oracle/components/FlexContainer'
import Layout from '@oracle/components/Layout'
import RowCard from '@oracle/components/RowCard'
import RowDataTable from '@oracle/components/RowDataTable'
import Spacing from '@oracle/elements/Spacing'
import Text from '@oracle/elements/Text'
import { Column } from '@oracle/icons'
import { DATASET_PAYLOAD, isBadQuality } from '@components/utils'
import { UNIT } from '@oracle/styles/units/spacing'

const ColumnView: NextPage = () => {
  const columnID = DATASET_PAYLOAD.id;
  const columnTypes = Object.entries(DATASET_PAYLOAD.metadata.column_types);

  const viewDataset = () => Router.push(`/datasets/${columnID}`);

  const headEl = (
    <FlexContainer alignItems="justify-right" flexDirection="row-reverse" >
      <Button 
        onClick={viewDataset}
      >
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
      <Spacing pb={3} pt={3}>
        <RowDataTable
          headerTitle="columns"
        >
          {
            columnTypes.map(([colName, colType], i) => {
              const quality = DATASET_PAYLOAD.statistics[`${colName}/quality`];

              return (
                <RowCard
                  key={`${colName}-${i}`}
                  columnFlexNumbers={[1, 9, 2]}
                >
                  <FlexContainer alignItems="center">
                    {/* no icons for column types? */}
                    <Text>{i+1}</Text>
                    <Spacing mr={4} />
                    <Column secondary />
                    <Spacing mr={1} />
                    <Text>{colName}</Text>
                  </FlexContainer>
                  <Spacing mr={8} />
                  <Text
                    bold={isBadQuality(quality)}
                    danger={isBadQuality(quality)}
                  >
                    {quality}
                  </Text>
                </RowCard>
              );
            })
          }
        </RowDataTable>
      </Spacing>
    </Layout>
  )
}

export default ColumnView
