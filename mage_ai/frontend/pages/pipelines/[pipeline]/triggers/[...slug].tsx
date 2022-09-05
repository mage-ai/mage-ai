import React, { useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import CreateSchedule from '@components/Orchestration/CreateSchedule';
import FlexContainer from '@oracle/components/FlexContainer';
import OrchestrationDetail from '@components/Orchestration/OrchestrationDetail';
import PipelineDetailPage from '@components/PipelineDetailPage';
import Spacing from '@oracle/elements/Spacing';
import TriggerEdit from '@components/Triggers/Edit';
import api from '@api';
import { BreadcrumbType } from '@components/shared/Header';
import { PAGE_NAME_EDIT } from '@components/PipelineDetail/constants';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';

type TriggerDetailPageProps = {
  pipelineScheduleId?: string;
  pipelineUUID: string;
  slug?: string[];
  subpath: string;
};

function TriggerDetailPage({
  pipelineScheduleId,
  pipelineUUID,
  subpath,
}: TriggerDetailPageProps) {
  const {
    data: dataGlobalVariables,
    mutate: fetchVariables,
  } = api.variables.pipelines.list(pipelineUUID);
  const globalVariables = dataGlobalVariables?.variables;

  const {
    data: pipelineScheduleData,
    mutate: fetchPipelinesSchedule,
  } = api.pipeline_schedules.detail(pipelineScheduleId);
  const pipelineSchedule = pipelineScheduleData?.pipeline_schedule;

  const [errors, setErrors] = useState(null);

  const {
    data,
    isLoading,
    mutate: fetchPipeline,
  } = api.pipelines.detail(pipelineUUID);
  const pipeline = {
    ...data?.pipeline,
    uuid: pipelineUUID,
  };

  const { data: filesData } = api.files.list();
  const projectName = useMemo(() => filesData?.files?.[0]?.name, [filesData]);

  const isEditPage = PAGE_NAME_EDIT === subpath;
  const subheader = useMemo(() => {
    if (isEditPage) {
      return (
        <FlexContainer alignItems="center">
          <Button
            onClick={() => true}
            outline
            primary
          >
            Save changes
          </Button>

          <Spacing mr={1} />

          <Button
            blackBorder
            onClick={() => true}
            outline
          >
            Cancel
          </Button>
        </FlexContainer>
      );
    }

    return undefined;
  }, [
    isEditPage,
  ]);

  const content = useMemo(() => {
    if (isEditPage) {
      return (
        <>
          <TriggerEdit
            pipeline={pipeline}
            pipelineSchedule={pipelineSchedule}
            setErrors={setErrors}
            variables={globalVariables}
          />

          <CreateSchedule
            editSchedule
            pipeline={pipeline}
            pipelineSchedule={pipelineSchedule}
            setErrors={setErrors}
            variables={globalVariables}
          />
        </>
      );
    } else {
      return (
        <OrchestrationDetail
          pipeline={pipeline}
          pipelineSchedule={pipelineSchedule}
        />
      );
    }
  }, [
    globalVariables,
    isEditPage,
    pipeline,
    pipelineSchedule,
    setErrors,
  ]);

  const breadcrumbs = useMemo(() => {
    const arr: BreadcrumbType[] = [
      {
        label: () => 'Triggers',
        linkProps: {
          as: `/pipelines/${pipelineUUID}/triggers`,
          href: '/pipelines/[pipeline]/triggers',
        },
      },
    ];

    if (pipelineSchedule) {
      let linkProps;
      if (isEditPage) {
        linkProps = {
          as: `/pipelines/${pipelineUUID}/triggers/${pipelineSchedule.id}`,
          href: '/pipelines/[pipeline]/triggers/[...slug]',
        };
      }

      arr.push({
        label: () => pipelineSchedule.name,
        linkProps,
      });
    }

    return arr;
  }, [
    isEditPage,
    pipelineSchedule,
  ]);

  const pageTitle = useMemo(() => {
    const title = pipelineSchedule?.name;

    if (!title) {
      return null;
    }

    if (isEditPage) {
      return `Edit ${title}`;
    }

    return title;
  }, [
    isEditPage,
    pipelineSchedule,
  ]);

  if (PAGE_NAME_EDIT === subpath) {
    return (
      <TriggerEdit
        fetchPipelinesSchedule={fetchPipelinesSchedule}
        pipeline={pipeline}
        pipelineSchedule={pipelineSchedule}
        setErrors={setErrors}
        variables={globalVariables}
      />
    );
  }

  return (
    <PipelineDetailPage
      breadcrumbs={breadcrumbs}
      pageName={PageNameEnum.TRIGGERS}
      pipeline={pipeline}
      subheader={subheader}
      title={() => pageTitle}
    >
      {content}
    </PipelineDetailPage>
  )
}

TriggerDetailPage.getInitialProps= async(ctx: any) => {
  const {
    pipeline: pipelineUUID,
    slug: slugArray,
  }: {
    pipeline: string,
    pipeline_run_id: number;
    slug: string[],
  } = ctx.query;

  if (Array.isArray(slugArray)) {
    const [pipelineScheduleId, subpath] = slugArray;
;
    return {
      pipelineScheduleId,
      pipelineUUID,
      subpath,
    }
  }

  return {
    pipelineUUID,
  }
}

export default TriggerDetailPage;
