import Button, { ButtonGroup } from '@mana/elements/Button';
import DragWrapper from '../DragWrapper';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { isEmptyObject } from '@utils/hash';
import { buildOutputNode } from '@components/v2/Apps/PipelineCanvas/utils/items';
import { setNested } from '@utils/hash';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import EventStreamType from '@interfaces/EventStreamType';
import Link from '@mana/elements/Link';
import html2canvas from 'html2canvas';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import TextInput from '@mana/elements/Input/TextInput';
import moment from 'moment';
import styles from '@styles/scss/components/Canvas/Nodes/DraggableAppNode.module.scss';
import stylesEditor from '@styles/scss/components/Canvas/Nodes/Apps/Editor.module.scss';
import useAppEventsHandler, {
  CustomAppEventEnum,
  convertEvent,
} from '../../../Apps/PipelineCanvas/useAppEventsHandler';
import useDispatchMounted from '../useDispatchMounted';
import { AppNodeType, NodeType, OutputNodeType } from '../../interfaces';
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
import { TooltipAlign, TooltipWrapper, TooltipDirection, TooltipJustify } from '@context/v2/Tooltip';
import { areEqualRects, areDraggableStylesEqual } from '../equals';
import { convertToMillisecondsTimestamp } from '@utils/date';
import { draggableProps } from '../draggable/utils';
import { executionDone } from '@components/v2/ExecutionManager/utils';
import { setupDraggableHandlers } from '../utils';
import { CanvasNodeType } from '../interfaces';
import {
  ArrowsAdjustingFrameSquare,
  DiamondShared,
  AppVersions,
  IdentityTag,
  Menu,
  PanelCollapseLeft,
  PanelCollapseRight,
  Builder,
  AddV2,
  Grab,
  GroupV2,
  Comment,
  Conversation,
  Save,
  CloseV2,
} from '@mana/icons';
import BlockType from '@interfaces/BlockType';
import { nodeClassNames } from '../utils';

const PADDING_HORIZONTAL = 16;

type NodeType = {
  blocks: BlockType[];
  index?: number;
  useCustomDragPreviewImage?: false;
};

const DraggableAppNode: React.FC<NodeType & CanvasNodeType> = ({
  draggable,
  handlers,
  block,
  index = 0,
  node,
  rect,
  useCustomDragPreviewImage = false,
  executeCode,
  subscribe,
}) => {
  const app = useMemo(() => (node as AppNodeType)?.app, [node]);
  const fetchDetailCountRef = useRef(0);
  const imageDataRef = useRef<string | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const handleOnMessageRef = useRef<(event: EventStreamType) => void>(null);
  const [executing, setExecuting] = useState(false);
  const [outputNodes, setOutputNodes] = useState<OutputNodeType[]>(null);

  const { dispatchAppEvent } = useAppEventsHandler(node as any);
  const { phaseRef } = useDispatchMounted(node, nodeRef);
  const [asideBeforeOpen, setAsideBeforeOpen] = React.useState(false);
  const [asideAfterOpen, setAsideAfterOpen] = React.useState(false);

  const renderRef = useRef(0);
  DEBUG.editor.node &&
    console.log(
      '[DraggableAppNode] render',
      app?.status,
      renderRef.current++,
      phaseRef.current,
      node,
    );

  const { configuration } = block ?? {};
  const { file } = configuration ?? {};

  useEffect(() => {
    const consumerID = [String(node.id), app.type, app.subtype].filter(Boolean).join(':');
    // subscribe(consumerID, {
    //   onMessage: (event: EventStreamType) => {
    //     handleOnMessageRef?.current?.(event);
    //     if (executionDone(event)) {
    //       setExecuting(false);
    //     }
    //   },
    // });
  }, [app, node, subscribe]);

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
      containerClassName: [stylesEditor.editorContainer].filter(Boolean).join(' '),
      editorClassName: [stylesEditor.editorMain].filter(Boolean).join(' '),
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
              await new Promise(resolve => setTimeout(resolve, 2000));

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
  } = toolbars ?? ({} as any);

  useEffect(() => {
    if (fetchDetailCountRef.current === 0 && file?.path) {
      mutate.detail.mutate({
        // Exact same code as in BlockNodeWrapper
        id: file?.path,
        onSuccess: resp => {
          const itemf = resp?.data?.browser_item;

          // This is handled inside useApp.
          // updateFileCache({ server: itemf });

          const eventStreams = itemf?.output?.reduce(
            (acc, result) =>
              setNested(acc, [result.process.message_request_uuid, result.result_id].join('.'), {
                result,
              }),
            {},
          );

          if (!isEmptyObject(eventStreams)) {
            const outputNode = {
              ...buildOutputNode(node, block, {
                uuid: (block as any)?.uuid,
              } as any),
              eventStreams,
              node,
            };
            setOutputNodes([outputNode as OutputNodeType]);
            dispatchAppEvent(CustomAppEventEnum.OUTPUT_UPDATED, {
              eventStreams,
              node,
              output: outputNode,
            });
          }
        },
        query: {
          output_namespace: 'code_executions',
        },
      });
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

  const colorNames = getColorNamesFromItems([node]);
  const baseColor = colorNames?.[index]?.base;
  const lastModified = useMemo(() => {
    if (original?.modified_timestamp) {
      return moment(convertToMillisecondsTimestamp(original?.modified_timestamp ?? 0)).fromNow();
    }
  }, [original?.modified_timestamp]);

  return (
    <div className={[styles.appNodeContainer].join(' ')}>
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
            onClick={() =>
              executeCode(editor.getValue(), {
                output_dir: file?.path,
              })
            }
            small
          />

          <TextInput basic placeholder="/" style={{ paddingBottom: 8, paddingTop: 8 }} />

          {/* <Button
            Icon={asideAfterOpen ? PanelCollapseRight : Builder}
            basic={asideAfterOpen}
            onClick={() => setAsideAfterOpen(true)}
            small
          /> */}

          <Button Icon={Grab} onClick={event => handleUpdateLayout(event as any)} small />
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
              description: stale
                ? `You have unsaved changes. Content was modified ${lastModified}.`
                : 'Save current file content.',
              iconProps: stale ? { colorName: 'red' } : {},
              onClick: saveCurrentContent,
              uuid: 'Save',
            },
            {
              Icon: Conversation,
              uuid: 'Chat',
              description: 'Get support in the community channel on Slack',
              href: 'https://mage.ai/chat',
              target: '_blank',
              anchor: 'true',
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
              tooltip={
                <Text secondary small>
                  {description ?? label?.() ?? uuid}
                </Text>
              }
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
                {label && (
                  <Text medium small>
                    {label()}
                  </Text>
                )}
              </Button>
            </TooltipWrapper>
          ))}
        </Grid>

        <Grid borders templateRows="auto 1fr">
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
                    <Button asLink onClick={event => alert('Edit')}>
                      <Text monospace small>
                        {block?.configuration?.file_source?.path}
                      </Text>
                    </Button>
                  </Grid>
                }
              >
                <Text monospace secondary small>
                  {block?.name ?? block?.uuid}
                </Text>
              </TooltipWrapper>
            </Grid>
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
            <EditorContainerStyled>{main}</EditorContainerStyled>
          </Grid>
        </Grid>

        {stale && (
          <Grid borders padding={16}>
            <div
              style={{
                maxWidth: 500,
              }}
            >
              <Text muted xsmall>
                Content was last saved{' '}
                <Text inline warning xsmall>
                  {lastModified}
                </Text>{' '}
                and the server content is different from the current local content. Save the current
                content or reset it with the server content.
              </Text>

              <br />

              <Grid autoFlow="column" columnGap={8} justifyContent="start" templateColumns="auto">
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
              </Grid>
            </div>
          </Grid>
        )}

        {outputNodes?.map(outputNode => (
          <OutputGroups
            handleOnMessageRef={handleOnMessageRef}
            key={outputNode?.id}
            node={outputNode}
          />
        ))}
      </Grid>
    </div>
  );
};

export default DraggableAppNode;
