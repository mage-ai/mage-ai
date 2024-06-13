// webSocket.onopen = () => {
//     languageClient.start();
//     // Notify LSP server about opened files
//     monaco.editor.getModels().forEach(model => {
//         languageClient.sendNotification('textDocument/didOpen', languageclient.TextDocumentItem.create(
//             model.uri.toString(),
//             model.getLanguageId(),
//             1,
//             model.getValue()
//         ));
//     });

//     webSocket.onclose = () => languageClient.stop();
// };

// Monitor editor for changes and notify the LSP server
// editor.onDidChangeModelContent(event => {
//     const model = editor.getModel();
//     languageClient.sendNotification('textDocument/didChange', {
//         textDocument: {
//             uri: model.uri.toString(),
//             version: model.getVersionId()
//         },
//         contentChanges: [{ text: model.getValue() }]
//     });
// });

// editor.onDidChangeModel(event => {
//     const model = event.newModel;
//     if (model) {
//         languageClient.sendNotification('textDocument/didOpen', languageclient.TextDocumentItem.create(
//             model.uri.toString(),
//             model.getLanguageId(),
//             1,
//             model.getValue()
//         ));
//     }
// });

// monaco.editor.onDidCreateModel(model => {
//     languageClient.sendNotification('textDocument/didOpen', languageclient.TextDocumentItem.create(
//         model.uri.toString(),
//         model.getLanguageId(),
//         1,
//         model.getValue()
//     ));
// });

// monaco.editor.onWillDisposeModel(model => {
//     languageClient.sendNotification('textDocument/didClose', {
//         textDocument: { uri: model.uri.toString() }
//     });
// });

// async function addNewModel(wrapper, codeResources: any): Promise<void> {
//   const editorApp = wrapper.getMonacoEditorApp();
//   const editor = editorApp.getEditor();

//   if (!editor) {
//     return Promise.reject(
//       new Error('You cannot add a new model as neither editor nor diff editor is available.'),
//     );
//   }

//   // Step 1: Create a new model reference
//   const newModelRef = await editorApp.buildModelRef(codeResources);
//   if (!newModelRef) {
//     return Promise.reject(new Error('Failed to create new model reference.'));
//   }

//   // Step 2: Update editor models with the new model
//   const modelRefs = { modelRef: newModelRef, modelRefOriginal: undefined };
//   await editorApp.updateEditorModels(modelRefs);

//   console.log(editorApp.getTextModels());
//   console.log(editorApp.getModelRefs());

//   const textModel = editorApp.getTextModels()?.text;
//   textModel?.setValue(`print("Hello, World!") ${Number(new Date())} ${textModel.uri}`);
// }

export default {};
