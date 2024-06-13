export const createWorker = async () => {
  // const worker = new Worker();
  // worker.onmessage = (event: MessageEvent) => {
  //   if (!itemsRootRef?.current) {
  //     const node = document.getElementById(rootID);
  //     itemsRootRef.current = createRoot(node as HTMLElement);
  //   }
  //   if (itemsRootRef?.current) {
  //     itemsRootRef.current.render(
  //       <React.StrictMode>
  //         <DeferredRenderer idleTimeout={1}>
  //           <ThemeProvider theme={themeContext}>
  //             {Object.values(event?.data || {}).map(
  //               (item: ItemDetailType, idx: number) => (
  //                 <Item
  //                   app={app}
  //                   item={item as ItemDetailType}
  //                   key={`${item.name}-${idx}`}
  //                   onClick={(event: React.MouseEvent<HTMLDivElement>, itemClicked) => {
  //                     console.log('onClick', itemClicked);
  //                     removeContextMenu();
  //                     if (ItemTypeEnum.FILE === itemClicked?.type) {
  //                       addApp(
  //                         {
  //                           options: {
  //                             file: {
  //                               content: itemClicked?.content,
  //                               uri: itemClicked?.path,
  //                             },
  //                           },
  //                           subtype: AppSubtypeEnum.IDE,
  //                           type: AppTypeEnum.EDITOR,
  //                           uuid: itemClicked?.name,
  //                         },
  //                         {
  //                           grid: {
  //                             relative: {
  //                               layout: {
  //                                 column: 1,
  //                               },
  //                               uuid: app?.uuid,
  //                             },
  //                           },
  //                         },
  //                       );
  //                     }
  //                   }}
  //                   onContextMenu={(event: React.MouseEvent<HTMLDivElement>) =>
  //                     renderContextMenu(item, event)
  //                   }
  //                   themeContext={themeContext}
  //                 />
  //               ),
  //             )}
  //           </ThemeProvider>
  //         </DeferredRenderer>
  //       </React.StrictMode>,
  //     );
  //   }
  // };
  // worker.postMessage({
  //   filePaths: filePathsRef.current,
  //   groupByStrategy: GroupByStrategyEnum.DIRECTORY,
  // });
  // return () => worker.terminate();
};
