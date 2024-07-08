import Button, { ButtonGroup } from '@mana/elements/Button';
import EventStreamType from '@interfaces/EventStreamType';
import Link from '@mana/elements/Link';
import html2canvas from 'html2canvas';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import TextInput from '@mana/elements/Input/TextInput';
import moment from 'moment';
import styles from '@styles/scss/components/Canvas/Nodes/DraggableAppNode.module.scss';
import stylesEditor from '@styles/scss/components/Canvas/Nodes/Apps/Editor.module.scss';
import useAppEventsHandler, { CustomAppEventEnum, convertEvent } from '../../../Apps/PipelineCanvas/useAppEventsHandler';
import useDispatchMounted from '../useDispatchMounted';
import { AppNodeType, NodeType, RectType } from '../../interfaces';
import { getColorNamesFromItems } from '../utils';
import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';
import useApp from '../../../Apps/Editor/useApp';
import { DEBUG } from '@components/v2/utils/debug';
import { DragAndDropType } from '../types';
import OutputGroups from '../CodeExecution/OutputGroups';
import { EditorContainerStyled } from './index.style';
import { ExecutionManagerType } from '../../../ExecutionManager/interfaces';
import { Minimize, Chat, BlockGenericV2, PlayButtonFilled } from '@mana/icons';
import { NodeWrapper } from '../NodeWrapper';
import { TooltipAlign, TooltipWrapper, TooltipDirection, TooltipJustify } from '@context/Tooltip';
import { areEqualRects, areDraggableStylesEqual } from '../equals';
import { convertToMillisecondsTimestamp } from '@utils/date';
import { draggableProps } from '../draggable/utils';
import { executionDone } from '@components/v2/ExecutionManager/utils';
import { setupDraggableHandlers } from '../utils';
import { CanvasNodeType } from '../interfaces';
import {
  ArrowsAdjustingFrameSquare, DiamondShared, AppVersions, IdentityTag, Menu, PanelCollapseLeft,
  PanelCollapseRight, Builder, AddV2, Grab, GroupV2, Comment, Conversation, Save,
  CloseV2
} from '@mana/icons';
import BlockType from '@interfaces/BlockType';
import { nodeClassNames } from '../utils';

const PADDING_HORIZONTAL = 16;

type NodeType = {
  blocks: BlockType[];
  index?: number;
  useCustomDragPreviewImage?: false;
  useExecuteCode: ExecutionManagerType['useExecuteCode'];
  useRegistration: ExecutionManagerType['useRegistration'];
};

const DraggableAppNode: React.FC<NodeType & CanvasNodeType> = ({
  draggable,
  handlers,
  blocks,
  index = 0,
  node,
  rect,
  useCustomDragPreviewImage = false,
  useExecuteCode,
  useRegistration,
}) => {
  const fetchDetailCountRef = useRef(0);
  const imageDataRef = useRef<string | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const handleOnMessageRef = useRef<(event: EventStreamType) => void>(null);
  const [executing, setExecuting] = useState(false);

  const { dispatchAppEvent } = useAppEventsHandler(node as any);
  const { phaseRef } = useDispatchMounted(node, nodeRef);

  const app = useMemo(() => (node as AppNodeType)?.app, [node]);
  const [asideBeforeOpen, setAsideBeforeOpen] = React.useState(false);
  const [asideAfterOpen, setAsideAfterOpen] = React.useState(false);

  const renderRef = useRef(0);
  DEBUG.editor.node && console.log(
    '[DraggableAppNode] render',
    app?.status,
    renderRef.current++,
    phaseRef.current,
    node,
  );

  const block = blocks?.[index] || node?.block;
  const { configuration } = block ?? {};
  const { file } = configuration ?? {};

  const {
    executeCode,
  } = useExecuteCode((block as any)?.uuid, (block as any)?.uuid);
  const { subscribe, unsubscribe } = useRegistration((block as any)?.uuid, (block as any)?.uuid);

  useEffect(() => {
    const consumerID = [String(node.id), app.type, app.subtype].filter(Boolean).join(':');
    subscribe(consumerID, {
      onMessage: (event: EventStreamType) => {
        handleOnMessageRef?.current?.(event);
        if (executionDone(event)) {
          setExecuting(false);
        }
      },
    })
    return () => unsubscribe(consumerID);
  }, [app, node, subscribe, unsubscribe]);

  const appOptions = {
    configurations: {
      dimension: {
        height: Math.max(rect?.height ?? 0, 400),
        width: Math.max(rect?.width ?? 0, 400),
      },
      folding: false,
      glyphMargin: false,
      lineDecorationsWidth: PADDING_HORIZONTAL,
      lineNumbers: 'off',
      lineNumbersMinChars: 0,
    },
    file: file ?? {
      ...configuration?.file_source,
      path: configuration?.file_path,
    },
  };
  const { editor, main, mutate, toolbars } = useApp({
    app: {
      ...app,
      options: appOptions,
    },
    editor: {
      containerClassName: [
        stylesEditor.editorContainer,
      ].filter(Boolean).join(' '),
      editorClassName: [
        stylesEditor.editorMain,
      ].filter(Boolean).join(' '),
      persistResourceOnUnmount: true,
      style: {},
    },
    onMountEditor: () => {
      if (nodeRef?.current) {
        // This is required or else a preview of the node won’t be available when dragging.
        nodeRef.current.style.opacity = '1';
        nodeRef.current.style.visibility = 'visible';
        nodeRef.current.style.display = 'block';
      }

      if (useCustomDragPreviewImage && nodeRef?.current && !imageDataRef?.current) {
        const generateImage = async () => {
          const computedStyle =
            typeof window !== 'undefined' && window.getComputedStyle(nodeRef.current);

          if (computedStyle) {
            try {
              await new Promise((resolve) => setTimeout(resolve, 2000));

              const canvas = await html2canvas(nodeRef.current, { scale: 2, useCORS: true });
              const imageData = canvas.toDataURL('image/png', 1.0); // Ensure maximum quality
              imageDataRef.current = imageData;
              console.log('Generated Image:', imageData); // For debugging
            } catch (error) {
              console.log('Error generating image:', error);
            }
          } else {
            setTimeout(generateImage, 1000);
          }
        };

        generateImage();
      }
    },
    skipInitialFetch: true,
    useToolbars: true,
  });
  const {
    inputRef,
    main: mainContentResource,
    original,
    overrideLocalContentFromServer,
    overrideServerContentFromLocal,
    saveCurrentContent,
    stale,
  } = toolbars ?? {} as any;

  useEffect(() => {
    if (fetchDetailCountRef.current === 0 && file?.path) {
      mutate.detail.mutate({ id: file.path });
      fetchDetailCountRef.current += 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, file]);

  function handleStopApp(event: MouseEvent) {
    dispatchAppEvent(CustomAppEventEnum.STOP_APP, {
      event: convertEvent(event, {
        ...node,
        node,
      }),
    });
  }

  function handleUpdateLayout(event: MouseEvent) {
    dispatchAppEvent(CustomAppEventEnum.START_DRAGGING, {
      event: convertEvent(event, {
        ...node,
        node,
      }),
    });
  }

  const draggingHandlers = setupDraggableHandlers(
    handlers, node, nodeRef, block,
  );

  const sharedProps = useMemo(() => draggableProps({
    classNames: [styles.appNodeWrapper],
    draggable,
    node,
  }), [draggable, node]);

  const colorNames = getColorNamesFromItems([node]);
  const baseColor = colorNames?.[index]?.base;
  const lastModified = useMemo(() => {
    if (original?.modified_timestamp) {
      return moment(convertToMillisecondsTimestamp(original?.modified_timestamp ?? 0)).fromNow();
    }
  }, [original?.modified_timestamp]);

  return (
    <NodeWrapper
      {...sharedProps}
      className={[
        (sharedProps.className || []),
        // Class names reserved for the SettingsManager to determine what is visible
        // based on the selected groups.s
        ...nodeClassNames({
          ...node,
          block: {
            ...blocks?.[0],
            groups: (blocks as any)?.flatMap((b: any) => (b as any)?.groups ?? []) as any[],
          },
          status: app?.status as any
        }),
      ].filter(Boolean).join(' ')}
      // draggingNode={draggingNode}
      handlers={draggingHandlers}
      node={node}
      nodeRef={nodeRef}
      rect={rect}
    >
      <div className={[
        styles.appNodeContainer,
        app?.status && styles[app?.status],
      ]?.filter(Boolean)?.join((' '))}>
        <Grid
          rowGap={PADDING_HORIZONTAL / 2}
          style={{
            gridTemplateRows: 'auto auto 1fr auto',
          }}
          templateColumns="auto"
        >
          <Grid
            columnGap={PADDING_HORIZONTAL / 2}
            style={{ gridTemplateColumns: 'auto auto 1fr auto' }}
            templateRows="1fr"
          >
            <Button
              Icon={asideBeforeOpen ? PanelCollapseLeft : BlockGenericV2}
              basic={asideBeforeOpen}
              onClick={() => setAsideBeforeOpen(prev => !prev)}
              small
            />

            <Button
              Icon={PlayButtonFilled}
              backgroundcolor={baseColor}
              basic
              bordercolor={baseColor}
              loading={executing}
              onClick={() => executeCode(editor.getValue())}
              small
            />

            <TextInput basic placeholder="/" style={{ paddingBottom: 8, paddingTop: 8 }} />

            {/* <Button
              Icon={asideAfterOpen ? PanelCollapseRight : Builder}
              basic={asideAfterOpen}
              onClick={() => setAsideAfterOpen(true)}
              small
            /> */}

            <Button
              Icon={Grab}
              onClick={event => handleUpdateLayout(event as any)}
              small
            />
          </Grid>

          <Grid
            autoFlow="column"
            backgroundColor="graylo"
            borders
            columnGap={40}
            justifyContent="start"
            paddingBottom={6}
            paddingLeft={PADDING_HORIZONTAL}
            paddingRight={PADDING_HORIZONTAL}
            paddingTop={6}
            templateRows="auto"
          >
            {[
              {
                Icon: Save,
                description: stale ? `You have unsaved changes. Content was modified ${lastModified}.` : 'Save current file content.',
                iconProps: stale ? { colorName: 'red' } : {},
                onClick: saveCurrentContent,
                uuid: 'Save',
              },
              {
                Icon: Conversation,
                uuid: 'Chat',
                description: 'Get support in the community channel on Slack', href: 'https://mage.ai/chat', target: '_blank', anchor: 'true'
              },
              // {
              //   Icon: Grab,
              //   uuid: 'Layout',
              //   description: 'Drag to reposition app',
              //   onClick: handleUpdateLayout,
              // },
              {
                Icon: Comment,
                uuid: 'Comment',
                description: 'Add a comment to the pipeline or for a specific block',
                onClick: event => alert('Comment'),
              },
              {
                Icon: CloseV2,
                uuid: 'Close',
                description: 'Close app',
                onClick: handleStopApp,
              },
            ].map(({ Icon, anchor, label, description, href, iconProps, target, uuid, onClick }) => (
              <TooltipWrapper
                key={uuid}
                tooltip={<Text secondary small>{description ?? label?.() ?? uuid}</Text>}
              >
                <Button
                  Icon={iconPropsInit => Icon && <Icon {...{ ...iconPropsInit, ...iconProps }} />}
                  anchor={anchor}
                  basic
                  data-loading-style="inline"
                  href={href}
                  // loading
                  onClick={onClick ?? undefined}
                  small
                  style={{ background: 'none', border: 'none' }}
                  target={target}
                >
                  {label &&
                    <Text medium small>
                      {label()}
                    </Text>
                  }
                </Button>
              </TooltipWrapper>
            ))}
          </Grid>

          <Grid
            borders
            templateRows="auto 1fr"
          >
            <Grid
              autoFlow="column"
              backgroundColor="graylo"
              bordersBottom
              columnGap={10}
              justifyContent="start"
              paddingBottom={18}
              paddingLeft={PADDING_HORIZONTAL}
              paddingRight={PADDING_HORIZONTAL}
              paddingTop={18}
              templateColumns="1fr auto"
              templateRows="auto"
            >
              <Grid
                autoFlow="column"
                columnGap={PADDING_HORIZONTAL}
                justifyContent="start"
                templateRows="auto"
              >
                <Button
                  Icon={iconProps => <DiamondShared {...iconProps} colorName="yellow" />}
                  basic
                  grouped="true"
                  onClick={event => alert('DiamondShared')}
                  small
                />
                <TooltipWrapper
                  tooltip={
                    <Grid rowGap={PADDING_HORIZONTAL / 2}>
                      <Button
                        asLink
                        onClick={event => alert('Edit')}
                      >
                        <Text monospace small>
                          {block?.configuration?.file_source?.path}
                        </Text>
                      </Button>
                    </Grid  >
                  }
                >
                  <Text monospace secondary small>
                    {block?.name ?? block?.uuid}
                  </Text >
                </TooltipWrapper>
              </Grid >
              {toolbars?.top}

              <Grid
                autoFlow="column"
                columnGap={PADDING_HORIZONTAL * 2}
                justifyContent="start"
                templateRows="auto"
              >
                <Button
                  Icon={iconProps => <IdentityTag {...iconProps} secondary />}
                  basic
                  grouped="true"
                  onClick={event => alert('IdentityTag')}
                  small
                />

                <Button
                  Icon={iconProps => <AppVersions {...iconProps} secondary />}
                  basic
                  grouped="true"
                  onClick={event => alert('AppVersions')}
                  small
                />
              </Grid>
            </Grid>

            <Grid className={styles.codeContainer}>
              <EditorContainerStyled>
                {main}
              </EditorContainerStyled>
            </Grid>
          </Grid>

          {stale && (
            <Grid
              borders
              padding={16}
            >
              <div style={{
                maxWidth: 500,
              }}>
                <Text muted xsmall>
                  Content was last saved <Text inline xsmall warning>{lastModified}</Text> and the server content
                  is different from the current local content.
                  Save the current content or reset it
                  with the server content.
                </Text>

                <br />

                <Grid columnGap={8} autoFlow="column" templateColumns="auto" justifyContent="start">
                  <Link onClick={() => overrideServerContentFromLocal()} xsmall>
                    Save local
                  </Link>

                  <Link
                    onClick={event => {
                      event.preventDefault();
                      overrideLocalContentFromServer();
                    }}
                    xsmall
                  >
                    Restore from server
                  </Link>
                </Grid >
              </div>

            </Grid>
          )}

          <OutputGroups
            handleOnMessageRef={handleOnMessageRef}
          />
        </Grid>
      </div >
    </NodeWrapper>
  );
}

function areEqual(p1: CanvasNodeType, p2: CanvasNodeType) {
  const equal = p1?.node?.id === p2?.node?.id
    && areDraggableStylesEqual(p1, p2)
    && areEqualRects({ rect: p1?.rect }, { rect: p2?.rect });

  DEBUG.editor.node && console.log('DraggableAppNode.areEqual', equal, p1, p2);
  return equal;
}

export default React.memo(DraggableAppNode, areEqual);
