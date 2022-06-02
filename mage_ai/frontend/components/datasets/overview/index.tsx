import React, { useEffect, useState } from 'react';
import Router from 'next/router';
import { useMutation } from 'react-query';

import ActionForm from '@components/ActionForm';
import ActionPayloadType from '@interfaces/ActionPayloadType';
import BaseTable from '@oracle/components/Table/BaseTable';
import Button from '@oracle/elements/Button';
import FeatureProfiles from '@components/datasets/FeatureProfiles';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Layout from '@oracle/components/Layout';
import Overview from '@components/datasets/Insights/Overview';
import PageBreadcrumbs from '@components/PageBreadcrumbs';
import Select from '@oracle/elements/Inputs/Select';
import SimpleDataTable, { ColumnHeaderType, RowGroupDataType } from '@oracle/components/Table/SimpleDataTable';
import Spacing from '@oracle/elements/Spacing';
import Suggestions from '@components/suggestions';
import Tabs, { Tab } from '@oracle/components/Tabs';
import Text from '@oracle/elements/Text';
import TransformerActionType from '@interfaces/TransformerActionType';
import actionsConfig from '@components/ActionForm/actions';
import api from '@api';
import {
  CATEGORICAL_TYPES,
  DATE_TYPES,
  HUMAN_READABLE_MAPPING,
  METRICS_KEYS,
  METRICS_SORTED_MAPPING,
  NUMBER_TYPES,
  PERCENTAGE_KEYS,
  STAT_KEYS,
} from '../constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { deserializeFeatureSet } from '@utils/models/featureSet';
import { onSuccess } from '@api/utils/response';
import { removeAtIndex } from '@utils/array';
import { useGlobalState } from '@storage/state';

function Data({ slug }) {
  const [apiReloads, setApiReloads] = useGlobalState('apiReloads');

  const { data: featureSetRaw } = api.feature_sets.detail(slug);
  const featureSet = featureSetRaw ? deserializeFeatureSet(featureSetRaw) : {};
  const {
    pipeline,
    statistics,
  } = featureSet || {};
  const pipelineActions = Array.isArray(pipeline?.actions) ? pipeline?.actions : [];

  const {
    columns,
    rows,
  } = featureSet?.sample_data || {};
  const {
    column_types: colTypes,
  } = featureSet?.metadata || {};

  const features = Object.entries(featureSet?.metadata?.column_types || {})
    .map(([k, v]: [string, string]) => ({ columnType: v, uuid: k }));

  const [columnHeaderSample, setColumnHeaderSample] = useState<ColumnHeaderType[]>([]);
  const [metricSample, setMetricSample] = useState<RowGroupDataType>();
  const [statSample, setStatSample] = useState<RowGroupDataType>();

  // Fetch column Headers
  useEffect(() => {
    const headerJSON = [];
    columns?.map((header:any) => {
      headerJSON.push({
        label: header,
      });
    });
    setColumnHeaderSample(headerJSON);
  }, [columns]);

  // Calculates metrics
  useEffect(() => {
    if (statistics) {
      const stats = Object.keys(statistics);
      const metricRows = Array(METRICS_KEYS.length).fill(0);
      stats.map((key) => {
        if (METRICS_KEYS.includes(key)) {
          let value = statistics[key].toPrecision(2);
          const order = HUMAN_READABLE_MAPPING[key];
          const index = METRICS_SORTED_MAPPING[key];
          if (PERCENTAGE_KEYS.includes(key)) {
            value *= 100;
            value = `${value}%`;
          }
          metricRows[index] = {
            columnValues: [order, value],
          };
        }
      });
      setMetricSample({
        rowData: metricRows,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statistics]);
  // Report (Quality Metrics)

  // Report (Statistics)
  useEffect(() => {
    if (statistics && colTypes) {
      const stats = Object.keys(statistics);
      const types = Object.values(colTypes);
      const rowData = [];

      rowData.push({
        columnValues: ['Column count', types.length],
      });
      // Part one is the keys from metrics
      stats.map((key) => {
        if (STAT_KEYS.includes(key)) {
          const name = HUMAN_READABLE_MAPPING[key];
          rowData.push({
            columnValues: [name, statistics[key]],
          });
        }
      });

      // Part two is the count of data types
      let countCategory = 0;
      let countNumerical = 0;
      let countTimeseries = 0;

      types.map((val: string) => {
        if (CATEGORICAL_TYPES.includes(val)) {
          countCategory += 1;
        }
        else if (NUMBER_TYPES.includes(val)) {
          countNumerical += 1;
        } else if (DATE_TYPES.includes(val)) {
          countTimeseries += 1;
        }
      });

      rowData.push({
        columnValues: ['Categorical Features', countCategory],
      },{
        columnValues: ['Numerical Features', countNumerical],
      },{
        columnValues: ['Time series Features', countTimeseries],
      });
      setStatSample({ rowData });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statistics]);

  const [tab, setTab] = useState('data');
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

  const commitActionCallback = (response: any) => {
    setApiReloads({
      ...apiReloads,
      'feature_sets.detail': Number(new Date()),
    });
  };
  const [commitAction, { isLoading: isLoadingCommitAction }] = useMutation(
    api.pipelines.useUpdate(pipeline?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: commitActionCallback,
          successMessage: 'yay',
        },
      ),
    },
  );
  const saveAction = (newActionData: TransformerActionType) => {
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

    commitAction({
      ...pipeline,
      actions: removeAtIndex(pipelineActions, idx),
    });
  };

  return (
    <Layout
      centerAlign
      footer={<Spacing mt={UNIT} />}
    >
      <Spacing mt={UNIT}>
        {actionType && (
          <ActionForm
            actionType={actionType}
            axis={actionPayload?.axis}
            features={columns.map((col: any) => ({ uuid: col }))}
            onSave={() => saveAction({
              action_payload: {
                ...actionPayload,
                action_type: actionType,
              },
            })}
            payload={actionPayload}
            setPayload={setActionPayload}
          />
        )}

        <Spacing mt={5}>
          <Select
            // @ts-ignore
            compact
            onChange={e => setActionPayload(JSON.parse(e.target.value))}
            value={actionType}
            width={UNIT * 20}
          >
            <option value="">
              New action
            </option>

            {Object.entries(actionsConfig.rows).map(([k, v]) => (
              <option
                key={k}
                value={JSON.stringify({
                  action_type: k,
                  axis: 'row',
                })}
              >
                {v.title}
              </option>
            ))}

            {Object.entries(actionsConfig.columns).map(([k, v]) => v.multiColumns && (
              <option
                key={k}
                value={JSON.stringify({
                  action_type: k,
                  axis: 'column',
                })}
              >
                {v.title}
              </option>
            ))}
          </Select>
        </Spacing>
      </Spacing>

      <Spacing mt={UNIT} />
      {headEl}
      <Spacing mt={2} />

      {featureSet && (
        <Suggestions
          addAction={saveAction}
          featureSet={featureSet}
          removeAction={removeAction}
          removeSuggestion={(action) => console.log(action)}
        />
      )}

      <Spacing mt={4} />
      <Tabs
        bold
        defaultKey={tab}
        large
        noBottomBorder={false}
        onChange={key => setTab(key)}
      >
        <Tab key="data" label="Data">
          <Spacing mb={3} mt={3} />
          <BaseTable
            columnHeaders={columnHeaderSample}
            columnTitles={columns}
            rowGroupData={rows}
          />
        </Tab>
        <Tab key="reports" label="Reports">
          <Spacing mb={3} mt={3} />
          <FlexContainer justifyContent={'center'}>
            <Flex flex={1}>
              {/* Old app used [2, 1, 1] */}
              <SimpleDataTable
              columnFlexNumbers={[1, 1]}
              columnHeaders={[{ label: 'Quality Metrics' }]}
              rowGroupData={[metricSample]}
            />
            </Flex>
            <Spacing ml={8} />
            <Flex flex={1}>
              {/* Old app used: [1, 5] */}
              <SimpleDataTable
              columnFlexNumbers={[1, 1, 1]}
              columnHeaders={[{ label: 'Statistics' }]}
              rowGroupData={[statSample]}
            />
            </Flex>
          </FlexContainer>
          <Spacing my={8}>
            <FeatureProfiles
            features={features}
            statistics={statistics}
          />
          </Spacing>
        </Tab>

        <Tab key="visualizations" label="Visualizations">
          <Spacing mb={3} mt={3} />
          <Overview
            features={features}
            insightsOverview={insightsOverview}
            statistics={statistics}
          />
        </Tab>
      </Tabs>
    </Layout>
  );
}

export default Data;
