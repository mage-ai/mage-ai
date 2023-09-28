export function addKeyboardShortcut(monaco, editor, shortcuts) {
  shortcuts.forEach((shortcut) => {
    editor.addAction(shortcut);
  });
}
