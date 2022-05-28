import Router, { useRouter } from 'next/router'
import type { NextPage } from 'next'
import { useEffect, useMemo, useState } from 'react'

import Button from '@oracle/elements/Button'
import FlexContainer from '@oracle/components/FlexContainer'
import Layout from '@oracle/components/Layout'
import RowCard from '@oracle/components/RowCard'
import RowDataTable from '@oracle/components/RowDataTable'
import Spacing from '@oracle/elements/Spacing'
import Text from '@oracle/elements/Text'
import api from '@api'
import { Column } from '@oracle/icons'
import { UNIT } from '@oracle/styles/units/spacing'
import { isBadQuality } from '@components/utils'

const ColumnView: NextPage = () => {
  const columnTypes = Object.entries(DATASET_PAYLOAD.metadata.column_types);

  const viewDataset = () => Router.push(`/datasets`);

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
              const quality = featureSet.statistics[`${colName}/quality`];

              return (
                <RowCard
                  key={`${colName}-${i}`}
                  columnFlexNumbers={[0.5, 0.2, 9, 2]}
                  secondary={i % 2 === 1}
                >
                  <Text>{i+1}</Text>
                  <Column secondary />
                  <Text maxWidth={UNIT*50} overflowWrap>
                    {colName}
                  </Text>

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
