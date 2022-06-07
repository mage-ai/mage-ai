import React, { useEffect, useState } from 'react';
import Router from 'next/router';
import { useMutation } from 'react-query';

import ActionDropdown from '@components/ActionForm/ActionDropdown';
import ActionForm from '@components/ActionForm';
import ActionPayloadType from '@interfaces/ActionPayloadType';
import BaseTable from '@oracle/components/Table/BaseTable';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FeatureProfiles from '@components/datasets/FeatureProfiles';
import FeatureSetType from '@interfaces/FeatureSetType';
import FeatureType, { ColumnTypeEnum, FeatureResponseType } from '@interfaces/FeatureType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Layout from '@oracle/components/Layout';
import MultiColumn from '@oracle/components/Layout/MultiColumn';
import Overview from '@components/datasets/Insights/Overview';
import PageBreadcrumbs from '@components/PageBreadcrumbs';
import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import Spacing from '@oracle/elements/Spacing';
import Suggestions from '@components/suggestions';
import Tabs, { Tab } from '@oracle/components/Tabs';
import Text from '@oracle/elements/Text';
import TransformerActionType from '@interfaces/TransformerActionType';
import api from '@api';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import {
  createMetricsSample,
  createStatisticsSample,
} from './utils';
import { deserializeFeatureSet } from '@utils/models/featureSet';
import { goToWithQuery } from '@utils/routing';
import { onSuccess } from '@api/utils/response';
import { queryFromUrl } from '@utils/url';
import { removeAtIndex } from '@utils/array';

type DatasetOverviewProps = {
  featureSet: FeatureSetType;
  fetchFeatureSet: (arg: any) => void;
};

function DatasetOverview({
  featureSet: featureSetRaw,
  fetchFeatureSet,
}: DatasetOverviewProps) {
  const [errorMessages, setErrorMessages] = useState(null);
  const { tab: tabFromUrl } = queryFromUrl();
  const [currentTab, setCurrentTab] = useState();
  useEffect(() => {
    if (tabFromUrl) {
      setCurrentTab(tabFromUrl);
    } else {
      // @ts-ignore
      setCurrentTab('reports');
    }
  }, [currentTab, tabFromUrl]);

  const featureSet = featureSetRaw ? deserializeFeatureSet(featureSetRaw) : {};
  const {
    metadata,
    pipeline,
    statistics,
  } = featureSet || {};
  const pipelineActions = Array.isArray(pipeline?.actions) ? pipeline?.actions : [];

  const {
    columns,
    rows,
  } = featureSet?.sample_data || {};
  const {
    column_types: columnTypes,
  } = metadata || {};
  const {
    header_types: headerTypes,
  } = featureSet?.metadata?.column_types || {};
  const features: FeatureType[] = Object.entries(featureSet?.metadata?.column_types || {})
    .map(([k, v]: [string, ColumnTypeEnum]) => ({ columnType: v, uuid: k }));
  const featuresWithAltColType: FeatureResponseType[] = features.map(({ columnType, uuid }) => ({
    column_type: columnType,
    uuid,
  }));

  const columnHeaderSample = columns?.map((header:any) => ({
    label: header,
  }));
  const metricSample = statistics ? createMetricsSample(statistics, columnTypes) : null;
  const statSample = (statistics && columnTypes) ? createStatisticsSample(statistics, columnTypes) : null;

  const setTab = (newTab: string) => {
    goToWithQuery({
      tab: newTab,
    });
  };

  const viewColumns = (e) => {
    const pathname = window?.location?.pathname;
    e.preventDefault();
    Router.push(`${pathname}/features`);
  };

  const headEl = (
    <FlexContainer alignItems="center" justifyContent="space-between">
      <PageBreadcrumbs featureSet={featureSet} />
      <Button onClick={viewColumns}>
        <Text bold> Column view </Text>
      </Button>
    </FlexContainer>
  );

  const insightsOverview = featureSet?.['insights']?.[1] || {};

  const [actionPayload, setActionPayload] = useState<ActionPayloadType>();
  const actionType = actionPayload?.action_type;

  const [commitAction, { isLoading: isLoadingCommitAction }] = useMutation(
    api.pipelines.useUpdate(pipeline?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (response) => fetchFeatureSet({
            ...featureSet,
            pipeline: response,
          }),
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
  const saveAction = (newActionData: TransformerActionType) => {
    setErrorMessages(null);
    commitAction({
      ...pipeline,
      actions: [
        ...pipelineActions,
        newActionData,
      ],
    });
  };
  const removeAction = (existingActionData: TransformerActionType) => {
    const idx =
      pipelineActions.findIndex(({ id }: TransformerActionType) => id === existingActionData.id);

    setErrorMessages(null);
    commitAction({
      ...pipeline,
      actions: removeAtIndex(pipelineActions, idx),
    });
  };

  const closeAction = () => setActionPayload({} as ActionPayloadType);

  const selectActionEl = (
    <ActionDropdown
      actionType={actionType}
      setActionPayload={setActionPayload}
    />
  );

  return (
    <Layout
      centerAlign
      footer={<Spacing mt={UNIT} />}
      fullWidth
      pageTitle="Dataset Overview"
    >
      <MultiColumn
        after={featureSet && (
          <Suggestions
            addAction={saveAction}
            featureSet={featureSet}
            removeAction={removeAction}
            removeSuggestion={(action) => console.log(action)}
          />
        )}
        header={headEl}
      >
        {actionType && (
          <ActionForm
            actionType={actionType}
            axis={actionPayload?.axis}
            features={featuresWithAltColType}
            onClose={closeAction}
            onSave={() => {
              saveAction({
                action_payload: {
                  ...actionPayload,
                  action_type: actionType,
                },
              });
              closeAction();
            }}
            payload={actionPayload}
            setPayload={setActionPayload}
          />
        )}

        {errorMessages?.length >= 1 && (
          <Spacing my={PADDING_UNITS}>
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

        <Tabs
          actionEl={selectActionEl}
          bold
          currentTab={currentTab}
          large
          noBottomBorder={false}
          onChange={key => setTab(key)}
        >
          <Tab key="data" label="Data">
            <Spacing mt={PADDING_UNITS} />

            <BaseTable
              columns={columnHeaderSample}
              data={rows}
              datatype={headerTypes}
              titles={columns}
            />
          </Tab>

          <Tab key="reports" label="Reports">
            <Spacing mt={PADDING_UNITS} />
            <FlexContainer justifyContent={'center'}>
              <Flex flex={1}>
                {metricSample && (
                  <SimpleDataTable
                    columnFlexNumbers={[2, 1, 2 ]}
                    columnHeaders={[{ label: 'Quality Metrics' }]}
                    rowGroupData={[metricSample]}
                  />
                )}
              </Flex>

              <Spacing ml={PADDING_UNITS} />

              <Flex flex={1}>
                {statSample && (
                  <SimpleDataTable
                    columnFlexNumbers={[1, 1, 1]}
                    columnHeaders={[{ label: 'Statistics' }]}
                    rowGroupData={[statSample]}
                  />
                )}
              </Flex>
            </FlexContainer>

            <Spacing mt={PADDING_UNITS}>
              <FeatureProfiles
                features={features}
                featureSet={featureSet}
                statistics={statistics}
              />
            </Spacing>
          </Tab>

          <Tab key="visualizations" label="Visualizations">
            <Spacing mt={PADDING_UNITS} />
            <Overview
              features={features}
              insightsOverview={insightsOverview}
              statistics={statistics}
            />
          </Tab>
        </Tabs>
      </MultiColumn>
    </Layout>
  );
}

export default DatasetOverview;
