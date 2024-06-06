import { observableFromEvent } from '../../base/common/observable.js';
/**
 * Returns a facade for the code editor that provides observables for various states/events.
*/
export function obsCodeEditor(editor) {
    return ObservableCodeEditor.get(editor);
}
class ObservableCodeEditor {
    /**
     * Make sure that editor is not disposed yet!
    */
    static get(editor) {
        let result = ObservableCodeEditor._map.get(editor);
        if (!result) {
            result = new ObservableCodeEditor(editor);
            ObservableCodeEditor._map.set(editor, result);
            const d = editor.onDidDispose(() => {
                ObservableCodeEditor._map.delete(editor);
                d.dispose();
            });
        }
        return result;
    }
    constructor(editor) {
        this.editor = editor;
        this.model = observableFromEvent(this.editor.onDidChangeModel, () => this.editor.getModel());
    }
}
ObservableCodeEditor._map = new Map();
