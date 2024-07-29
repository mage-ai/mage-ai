import EventStreamType, { ExecutionStatusEnum, ResultType } from '@interfaces/EventStreamType';
import { MenuContext } from '@context/v2/Menu';
import PrivateRoute from '@components/shared/PrivateRoute';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import useExecutionManager from '@components/v2/ExecutionManager/useExecutionManager';
import { Builder, PipeIconVertical } from '@mana/icons';
import { FRAMEWORK_NAME_MAPPING, GroupUUIDEnum } from 'interfaces/PipelineExecutionFramework/types';
import { LayoutContext } from '@context/v2/Layout';
import { LayoutVersionEnum } from '@utils/layouts';
import { NextPageContext } from 'next';
import { PipelineExecutionFrameworkUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { buildIntraAppNavItems } from '@components/v2/Layout/Pipelines/Detail/header';
import { useMutate } from '@context/v2/APIMutation';
import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import PipelineType from '@interfaces/PipelineType';

const PipelineDetail = dynamic(() => import('@components/v2/Layout/Pipelines/Detail'), { ssr: false });

function PipelineDetailPage({
  slug,
  uuid,
}: {
  slug: (PipelineExecutionFrameworkUUIDEnum | GroupUUIDEnum)[];
  uuid: string;
}) {
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { changeRoute, header, page } = useContext(LayoutContext);
  const { removeContextMenu, renderContextMenu, shouldPassControl, useMenu } = useContext(MenuContext);

  const [pipeline, setPipeline] = useState<PipelineType>(null);

  const [frameworkUUID] = useMemo(() => {
    let arr = (slug ?? []);
    if (!Array.isArray(arr)) {
      arr = [arr];
    }

    return arr;
  }, [slug]);

  const contextMenuUUID =
    useMemo(() => [uuid, ...(Array.isArray(slug) ? slug : [slug])].join('/'), [slug, uuid]);

  const { hideMenu } = useMenu({
    containerRef,
    contextMenuRef,
    uuid: contextMenuUUID,
  });

  const mutants = useMutate(
    {
      id: uuid,
      idParent: frameworkUUID,
      resource: 'pipelines',
      resourceParent: 'execution_frameworks',
    },
    {
      automaticAbort: false,
      handlers: {
        detail: {
          onSuccess: (model: PipelineType) => {
            header?.setHeader?.({
              intraAppNavItems: buildIntraAppNavItems({
                changeRoute,
                framework: model?.framework,
                pipeline: model,
                hideMenu: () => hideMenu('NavigationButtonGroup'),
              }),
              buildInterAppNavItems: () => [
                {
                  Icon: PipeIconVertical,
                  linkProps: {
                    href: '/pipelines',
                  },
                  uuid: 'pipelines',
                },
                {
                  Icon: Builder,
                  linkProps: {
                    href: '/v2/pipelines/[uuid]/[...slug]',
                    as: `/v2/pipelines/${pipeline?.uuid}/${slug?.join('/')}`,
                  },
                  uuid: 'frameworks',
                },
                // ...items,
              ],
              cacheKey: [model.uuid, model?.framework.uuid].join(':'),
              navTag: (model?.framework as any)?.name ?? (model?.framework as any)?.uuid?.toUpperCase(),
              selectedNavItem: 'frameworks',
              title: model.name ?? model.uuid,
              uuid: contextMenuUUID,
              version: 1,
            });

            page?.setPage?.({
              title: FRAMEWORK_NAME_MAPPING[model?.framework.uuid] ?? model?.framework.uuid,
            });

            setPipeline(model);
          },
        },
      },
    },
  );

  const phaseRef = useRef(0);
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

  const { teardown: teardownEx, useExecuteCode, useRegistration } = useExecutionManager({
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
          title: errorRef.current ? errorRef.current.exception : titleRef.current,
        };

        page?.setPage && page?.setPage?.(pageStatus);
        statusRef.current = pageStatus;
      }

      messageRequestUUIDRef.current = mruuid;
    },
  });

  useEffect(() => {
    if (phaseRef.current === 0 && !pipeline) {
      mutants.detail.mutate();

      const loadServices = async () => {
        await import('@components/v2/IDE/Manager').then(mod => {
          mod.Manager.loadServices();
          phaseRef.current = 2;
        });
      };

      loadServices();
    }

    const disposeManager = async () => {
      await import('@components/v2/IDE/Manager').then(mod => {
        mod.Manager.dispose();
      });
    };

    return () => {
      try {
        disposeManager();
      } catch (error) {
        console.error(error);
      }

      // teardown();
      teardownEx();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipeline]);

  return (
    <>
      <PipelineDetail
        framework={pipeline?.framework as PipelineExecutionFrameworkType}
        pipeline={pipeline}
        useExecuteCode={useExecuteCode}
        useRegistration={useRegistration}
        containerRef={containerRef}
        renderContextMenu={renderContextMenu}
        removeContextMenu={removeContextMenu}
        shouldPassControl={shouldPassControl}
      />

      <div id={['pipeline-detail', contextMenuUUID].join(':')} ref={contextMenuRef} />
    </>
  );
}

PipelineDetailPage.getInitialProps = async (ctx: NextPageContext) => {
  const { slug, uuid } = ctx.query ?? {
    slug: [],
    uuid: null,
  };

  return {
    slug,
    uuid,
    version: LayoutVersionEnum.V2,
  };
};

export default PrivateRoute(PipelineDetailPage);
