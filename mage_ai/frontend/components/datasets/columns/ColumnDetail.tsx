import Router from 'next/router';
import { useEffect, useState } from 'react';
import { useMutation } from 'react-query';

import ActionDropdown from '@components/ActionForm/ActionDropdown';
import ActionForm from '@components/ActionForm';
import ActionPayloadType from '@interfaces/ActionPayloadType';
import TransformerActionType from '@interfaces/TransformerActionType';
import Button from '@oracle/elements/Button';
import ColumnAnalysis from '@components/datasets/Insights/ColumnAnalysis';
import FeatureSetType, { ColumnFeatureSetType } from '@interfaces/FeatureSetType';
import FeatureType, { COLUMN_TYPE_HUMAN_READABLE_MAPPING } from '@interfaces/FeatureType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Layout from '@oracle/components/Layout';
import MultiColumn from '@oracle/components/Layout/MultiColumn';
import PageBreadcrumbs from '@components/PageBreadcrumbs';
import Panel from '@oracle/components/Panel';
import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import Spacing from '@oracle/elements/Spacing';
import Tabs, { Tab } from '@oracle/components/Tabs';
import Text from '@oracle/elements/Text';
import api from '@api';

import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { getFeatureMapping, getFeatureSetStatistics } from '@utils/models/featureSet';
import { getHost } from '@api/utils/url';
import { getPercentage } from '@utils/number';
import { onSuccess } from '@api/utils/response';
import { removeAtIndex } from '@utils/array';
import { useCustomFetchRequest } from '@api';

type ColumnDetailProps = {
  featureId: string;
  featureSet: FeatureSetType;
  featureSetId: string;
};

function ColumnDetail({
  featureSet,
  featureSetId,
  featureId,
}: ColumnDetailProps) {
  const [errorMessages, setErrorMessages] = useState(null);
  const [columnFeatureSet, setColumnFeatureSet] = useState<ColumnFeatureSetType>(null);

  const features: FeatureType[] = Object.entries(featureSet?.metadata?.column_types || {})
    .map(([k, v]) => ({ columnType: v, uuid: k }));
  const featureMapping = getFeatureMapping(featureSet);
  const featureIndex = +featureId;

  // Individual column data
  const featureData = featureMapping[featureIndex];
  const featureUUID = featureData?.uuid;
  const columnType = featureData?.column_type;

  // Feature set data specific to column
  const sampleRowData = columnFeatureSet?.sample_data?.[featureUUID]?.map(value => ({
    columnValues: [value],
  }));
  const {
    id: pipelineId,
    actions: pipelineActions = [],
  } = columnFeatureSet?.pipeline || {};

  const [fetchColumnData, isLoadingColumnData] = useCustomFetchRequest({
    endpoint: `${getHost()}/feature_sets/${featureSetId}?column=${encodeURIComponent(featureUUID)}`,
    method: 'GET',
    onSuccessCallback: (response) => {
      setColumnFeatureSet(response);
    },
  });

  useEffect(() => {
    if (featureUUID) {
      fetchColumnData();
    }
  }, [featureUUID]);

  // Column statistics
  const insightsColumn = (featureSet?.insights?.[0] || []).find(({ feature }) => feature.uuid === featureUUID);
  const statisticsOverview = featureSet?.statistics || {};
  const featureSetStats = getFeatureSetStatistics(featureSet, featureUUID);
  const {
    completeness,
    count,
    count_distinct: countDistinct,
    invalid_value_count: invalidValueCount,
    null_value_count: nullValueCount,
    outlier_count: outlierCount,
    skew,
    validity,
  } = featureSetStats;
  const qualityMetrics: {
    columnValues: (string | number | any)[];
    uuid?: string | number;
  }[] = [
    {
      columnValues: [
        'Column type',
        COLUMN_TYPE_HUMAN_READABLE_MAPPING[columnType] || columnType,
      ],
    },
    {
      columnValues: [
        'Validity', getPercentage(validity),
      ],
    },
    {
      columnValues: [
        'Completeness', getPercentage(completeness),
      ],
    },
    {
      columnValues: [
        'Total values', count,
      ],
    },
    {
      columnValues: [
        'Unique values', countDistinct,
      ],
    },
    {
      columnValues: [
        'Missing values', nullValueCount,
      ],
    },
    {
      columnValues: [
        'Invalid values', invalidValueCount,
      ],
    },
  ];
  const warningMetrics = [
    {
      columnValues: [
        'Outliers', outlierCount,
      ],
    },
    {
      columnValues: [
        'Skewness', skew?.toFixed(3),
      ],
    },
  ];
  const noWarningMetrics = warningMetrics.every(
    ({ columnValues }) => (typeof columnValues[1] === 'undefined'),
  );

  const [tab, setTab] = useState('data');
  const viewColumns = (e) => {
    e.preventDefault();
    Router.push('/datasets');
  };

  const [actionPayload, setActionPayload] = useState<ActionPayloadType>();
  const actionType = actionPayload?.action_type;

  const [commitAction, { isLoading: isLoadingCommitAction }]: any = useMutation(
    api.pipelines.useUpdate(pipelineId),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (response) => fetchColumnData(),
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            const arr = [];
            if (message) {
              arr.push(...message.split('\n'));
            }
            if (errors) {
              arr.push(...errors);
            }
            if (arr.length >= 1) {
              setErrorMessages(arr);
            }
          },
        },
      ),
    },
  );
  const saveAction = (serializedData) => {
    const { action_payload: actionPayload } = serializedData;
    setErrorMessages(null);
    const updatedAction: TransformerActionType = {
      action_payload: {
        action_arguments: [
          featureUUID,
        ],
        action_code: '',
        action_options: {},
        action_type: actionType,
        action_variables: {},
        outputs: [],
        ...actionPayload,
      },
    };

    commitAction({
      actions: [
        ...pipelineActions,
        updatedAction,
      ],
    });
  };
  const removeAction = (existingActionData: TransformerActionType) => {
    const actionIdx = pipelineActions.findIndex(
      ({ id }: TransformerActionType) => id === existingActionData.id,
    );

    setErrorMessages(null);
    commitAction({
      actions: removeAtIndex(pipelineActions, actionIdx),
    });
  };

  const closeAction = () => setActionPayload({} as ActionPayloadType);

  const metricsTableEl = (
    <SimpleDataTable
      columnFlexNumbers={[1, 1]}
      columnHeaders={[{ label: 'Column summary' }]}
      rowGroupData={[{
        rowData: qualityMetrics,
      }]}
    />
  );

  return (
    <Layout
      centerAlign
      fullWidth
      pageTitle="Column Details"
    >
      <MultiColumn
        after={
          <>
            <Spacing mb={PADDING_UNITS}>
              <ActionDropdown
                actionType={actionType}
                columnOnly
                setActionPayload={setActionPayload}
              />
            </Spacing>

            {actionType && (
              <Spacing mb={2}>
                <ActionForm
                  actionType={actionType}
                  axis={actionPayload?.axis}
                  currentFeature={{
                    columnType: columnType,
                    uuid: featureUUID,
                  }}
                  onClose={closeAction}
                  onSave={() => {
                    saveAction({ action_payload: actionPayload });
                    closeAction();
                  }}
                  payload={actionPayload}
                  setPayload={setActionPayload}
                />
              </Spacing>
            )}

            {errorMessages?.length >= 1 && (
              <Spacing mt={3}>
                <Text bold>
                  Errors
                </Text>
                {errorMessages?.map((msg: string) => (
                  <Text key={msg} monospace xsmall>
                    {msg}
                  </Text>
                ))}
              </Spacing>
            )}
          </>
        }
        header={
          <FlexContainer alignItems="center" justifyContent="space-between">
            <PageBreadcrumbs featureSet={featureSet} />
            <Button onClick={viewColumns}>
              <Text bold> Datasets view </Text>
            </Button>
          </FlexContainer>
        }
      >
        <FlexContainer>
          <Flex flex="2" flexDirection="column">
            <Tabs
              bold
              defaultKey={tab}
              large
              noBottomBorder={false}
              onChange={key => setTab(key)}
            >
              <Tab key="data" label="Data">
                <Spacing my={1} />
                <FlexContainer justifyContent={'center'}>
                  <Flex flex={1}>
                    <SimpleDataTable
                      columnFlexNumbers={[1, 1]}
                      columnHeaders={[{ label: featureUUID }]}
                      rowGroupData={[{
                        rowData: sampleRowData,
                      }]}
                    />
                  </Flex>
                  <Spacing ml={PADDING_UNITS} />
                  <Flex flex={1}>
                    {metricsTableEl}
                  </Flex>
                </FlexContainer>
              </Tab>

              <Tab  key="reports" label="Reports">
                <Spacing my={1} />
                <FlexContainer justifyContent={'center'}>
                  <Flex flex={1}>
                    {metricsTableEl}
                  </Flex>
                  <Spacing ml={PADDING_UNITS} />
                  <Flex flex={1}>
                    {noWarningMetrics
                      ?
                        <Panel fullHeight={false} headerTitle="Warnings">
                          <Text>There are no warnings.</Text>
                        </Panel>
                      :
                        <SimpleDataTable
                          columnFlexNumbers={[1, 1]}
                          columnHeaders={[{ label: 'Warnings' }]}
                          rowGroupData={[{
                            rowData: warningMetrics,
                          }]}
                        />
                    }
                  </Flex>
                </FlexContainer>
              </Tab>

              <Tab key="visualizations" label="Visualizations">
                <Spacing my={1} />
                {count > 0 && (
                  <ColumnAnalysis
                    column={featureUUID}
                    features={features}
                    insights={insightsColumn}
                    statisticsByColumn={statisticsOverview[`${featureUUID}/value_counts`] || {}}
                    statisticsOverview={statisticsOverview}
                  />
                )}
              </Tab>
            </Tabs>
          </Flex>
        </FlexContainer>
      </MultiColumn>
    </Layout>
  );
}

export default ColumnDetail;
