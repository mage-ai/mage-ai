import Monitor from '@components/Monitor';
import PipelineType from '@interfaces/PipelineType';
import React, { useMemo } from 'react';
import api from '@api';

type BlockRuntimeMonitorsProps = {
  pipeline: PipelineType;
};

function BlockRuntimeMonitors({
  pipeline: pipelineProp,
}) {
  const pipelineUUID = pipelineProp.uuid;

  const { data: dataPipeline } = api.pipelines.detail(pipelineUUID);
  const pipeline = useMemo(() => ({
    ...dataPipeline?.pipeline,
    uuid: pipelineUUID,
  }), [
    dataPipeline,
    pipelineUUID,
  ]);

  const breadcrumbs = useMemo(() => {
    const arr = [];

    arr.push({
      bold: true,
      label: () => 'Monitors',
    });

    return arr;
  }, [
    pipeline,
  ]);

  return (
    <Monitor
      breadcrumbs={}
    >

    </Monitor>
  )
}