import BlockNodeComponent, { BlockNodeProps, BADGE_HEIGHT, PADDING_VERTICAL } from './BlockNode';
import { ThemeContext } from 'styled-components';
import ContextProvider from '@context/v2/ContextProvider';
import { AppConfigType } from '../../Apps/interfaces';
import EditorAppNode from './Apps/EditorAppNode';
import { EventContext } from '../../Apps/PipelineCanvas/Events/EventContext';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import { OpenInSidekick, Trash } from '@mana/icons';
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import React, { useState, useCallback, useContext, useMemo, useRef } from 'react';
import { NodeType } from '../interfaces';
import { setNested } from '@utils/hash';
import { RectType } from '@mana/shared/interfaces';
import { buildAppNode } from '@components/v2/Apps/PipelineCanvas/AppManager/utils';
import { AppSubtypeEnum, AppStatusEnum, AppTypeEnum } from '@components/v2/Apps/constants';
import { createPortal } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';
import { FileType } from '@components/v2/IDE/interfaces';

type BlockNodeType = {
  block: BlockType;
  dragRef?: React.MutableRefObject<HTMLDivElement>;
  index?: number;
  groupSelection?: boolean;
  node: NodeType;
  openApp?: (
    appConfig: AppConfigType,
    appNodeRef: React.MutableRefObject<HTMLDivElement>,
    callback: () => void,
  ) => void;
  showOutput?: () => void;
};

function BlockNode({
  block,
  dragRef,
  node,
  groupSelection,
  openApp,
  showOutput,
  ...rest
}: BlockNodeType, ref: React.MutableRefObject<HTMLElement>) {
  const themeContext = useContext(ThemeContext);
  const { name, type } = block;
  const timeoutRef = useRef(null);

  const appRootRef = useRef<Root>(null);
  const outputRootRef = useRef<Root>(null);
  const appNodeRef = useRef<HTMLDivElement>(null);
  const outputNodeRef = useRef<HTMLDivElement>(null);

  // APIs
  const fileRef = useRef<FileType>(null);
  const { mutations } = useContext(ModelContext);

  // Attributes
  const isGroup =
    useMemo(() => !type || [BlockTypeEnum.GROUP, BlockTypeEnum.PIPELINE].includes(type), [type]);
  const [editorAppActive, setEditorAppActive] = useState(false);

  // Controls
  const buttonBeforeRef = useRef<HTMLDivElement>(null);
  const timerStatusRef = useRef(null);

  const { handleContextMenu, removeContextMenu, setSelectedGroup } = useContext(EventContext);

  // Methods
  const submitCodeExecution = useCallback((event: React.MouseEvent<HTMLElement>) => {

  }, []);

  function updateBlock(event: any, key: string, value: any) {
    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      clearTimeout(timeoutRef.current);

      mutations.pipelines.update.mutate({
        event,
        onError: () => {
          ref?.current?.classList?.remove(stylesBlockNode.loading);
        },
        onStart: () => {
          ref?.current?.classList?.add(stylesBlockNode.loading);
        },
        onSuccess: () => {
          ref?.current?.classList?.remove(stylesBlockNode.loading);
        },
        payload: {
          block: setNested({
            configuration: block.configuration,
            uuid: block.uuid,
          }, key, value),
        },
      });
    }, 1000);
  }

  function renderEditorApp(opts?: {
    app?: AppConfigType;
    block?: BlockType;
    fileRef?: React.MutableRefObject<FileType>;
  }) {
    appRootRef.current ||= createRoot(appNodeRef.current);
    appRootRef.current.render(
      <ContextProvider theme={themeContext}>
        <EditorAppNode
          app={opts?.app}
          block={opts?.block ?? block}
          fileRef={opts?.fileRef ?? fileRef}
        />
      </ContextProvider>,
    );
  }

  function launchEditorApp(event: any) {
    const { configuration } = block ?? {};
    const { file } = configuration ?? {};

    mutations.files.detail.mutate({
      event,
      id: file?.path,
      onSuccess: ({ data }) => {
        fileRef.current = data?.browser_item;

        const app = {
          subtype: AppSubtypeEnum.CANVAS,
          type: AppTypeEnum.EDITOR,
          uuid: [block.uuid, AppTypeEnum.EDITOR, AppSubtypeEnum.CANVAS].join(':'),
        };

        openApp(app, appNodeRef, () => {
          renderEditorApp({
            app,
            block,
            fileRef,
          });
        });
      },
      query: {
        output_namespace: 'code_executions',
      },
    });
  }

  return (
    <div
      className={[
        stylesBlockNode.blockNodeWrapper,
        groupSelection && stylesBlockNode.groupSelection,
      ].filter(Boolean).join(' ')}
      onContextMenu={(event: any) => {
        if (groupSelection || event.metaKey) return;

        event.preventDefault();
        event.stopPropagation();

        const items = [];

        if (isGroup) {
          items.push({
            Icon: OpenInSidekick,
            onClick: (event: any) => {
              event?.preventDefault();
              setSelectedGroup(block);
              removeContextMenu(event);
            },
            uuid: `Teleport into ${block?.name}`,
          });
        } else {
          items.push({
            Icon: Trash,
            onClick: (event: any) => {
              event?.preventDefault();

              mutations.pipelines.update.mutate({
                event,
                onSuccess: () => {
                  removeContextMenu(event);
                },
                payload: (pipeline) => ({
                  ...pipeline,
                  blocks: pipeline?.blocks?.filter((b: BlockType) => b.uuid !== block.uuid),
                }),
              });
            },
            uuid: `Remove ${name} from pipeline`,
          });
        }

        handleContextMenu(event, items, {
          reduceItems: (i1, i2) => i1,
        });
      }}
      ref={ref as React.RefObject<HTMLDivElement>}
    >
      <BlockNodeComponent
        {...rest}
        block={block}
        buttonBeforeRef={buttonBeforeRef}
        dragRef={dragRef}
        groupSelection={groupSelection}
        node={node}
        openEditor={launchEditorApp}
        submitCodeExecution={submitCodeExecution}
        timerStatusRef={timerStatusRef}
        updateBlock={updateBlock}
      />
    </div>
  );
}

function areEqual(p1: BlockNodeType, p2: BlockNodeType) {
  return p1.block.uuid === p2.block.uuid
    && p1?.groupSelection === p2?.groupSelection;
}

export default React.memo(React.forwardRef(BlockNode), areEqual);

export { BADGE_HEIGHT, PADDING_VERTICAL };
