import PrivateRoute from '@components/shared/PrivateRoute';
import EventStreamType, { ExecutionStatusEnum, ResultType } from '@interfaces/EventStreamType';
import React, { useContext, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import useExecutionManager from '@components/v2/ExecutionManager/useExecutionManager';
import { LayoutContext } from '@context/v2/Layout';
import { LayoutVersionEnum } from '@utils/layouts';
import { NextPageContext } from 'next';
import { PipelineExecutionFrameworkUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { executionDone } from '@components/v2/ExecutionManager/utils';

const Builder = dynamic(() => import('@components/v2/Layout/Pipelines/Detail/Builder'), {
  ssr: false,
});

function PipelineDetailPage({
  framework,
  uuid,
}: {
  framework: PipelineExecutionFrameworkUUIDEnum;
  uuid: string;
}) {
  const errorRef = useRef<any>(null);
  const messageRequestUUIDRef = useRef<string>(null);
  const statusRef = useRef<{
    busy: boolean;
    error: boolean;
    notice: boolean;
    success: boolean;
    title?: string;
  }>(null);
  const titleRef = useRef<string>(null);

  const { page } = useContext(LayoutContext);
  const { teardown, useExecuteCode, useRegistration } = useExecutionManager({
    onMessage: (event: EventStreamType) => {
      if (!titleRef.current) {
        titleRef.current = page.title;
      }

      const status = event?.result?.status;

      if (ExecutionStatusEnum.INIT === status) {
        errorRef.current = null;
        messageRequestUUIDRef.current = null;
        statusRef.current = null;

        page?.setPage && page?.setPage?.({
          busy: false,
          error: false,
          notice: false,
          success: false,
          title: titleRef.current,
        });

        return;
      }

      const type = event?.result?.type;
      const mruuid = event?.result?.process?.message_request_uuid;

      if (event?.result?.error) {
        errorRef.current = event?.result?.error;
      }
      const error = ExecutionStatusEnum.ERROR === status
        || ExecutionStatusEnum.FAILURE === status
        || errorRef.current;
      const success = ExecutionStatusEnum.SUCCESS === status
        && [ResultType.DATA, ResultType.OUTPUT].includes(type)
        && (!statusRef.current
          || !statusRef.current.error
          || messageRequestUUIDRef.current !== mruuid);
      const notice = [
        ExecutionStatusEnum.CANCELLED,
        ExecutionStatusEnum.INTERRUPTED,
        ExecutionStatusEnum.TERMINATED,
      ].includes(status) && ResultType.STATUS === type;
      const busy = ExecutionStatusEnum.RUNNING === status
        && ResultType.STATUS === type
        && (
          !statusRef.current
          || (!statusRef.current.error && !statusRef.current.success)
          || messageRequestUUIDRef.current !== mruuid
        );

      if (error || success || busy || notice) {
        const pageStatus = {
          busy,
          error: Boolean(error),
          notice,
          success,
          title: undefined,
        };
        if (errorRef.current) {
          pageStatus.title = errorRef.current.exception;
        }

        page?.setPage && page?.setPage?.(pageStatus);
        statusRef.current = pageStatus;
      }

      messageRequestUUIDRef.current = mruuid;
    },
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => teardown(), []);

  return (
    <Builder
      frameworkUUID={framework}
      useExecuteCode={useExecuteCode}
      useRegistration={useRegistration}
      uuid={uuid}
    />
  );
}

PipelineDetailPage.getInitialProps = async (ctx: NextPageContext) => {
  const { framework, uuid } = ctx.query;
  return {
    framework,
    uuid,
    version: LayoutVersionEnum.V2,
  };
};

export default PrivateRoute(PipelineDetailPage);
