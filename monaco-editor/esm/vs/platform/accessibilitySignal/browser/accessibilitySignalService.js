import { localize } from '../../../nls.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IAccessibilitySignalService = createDecorator('accessibilitySignalService');
/** Make sure you understand the doc comments of the method you want to call when using this token! */
export const AcknowledgeDocCommentsToken = Symbol('AcknowledgeDocCommentsToken');
/**
 * Corresponds to the audio files in ./media.
*/
export class Sound {
    static register(options) {
        const sound = new Sound(options.fileName);
        return sound;
    }
    constructor(fileName) {
        this.fileName = fileName;
    }
}
Sound.error = Sound.register({ fileName: 'error.mp3' });
Sound.warning = Sound.register({ fileName: 'warning.mp3' });
Sound.foldedArea = Sound.register({ fileName: 'foldedAreas.mp3' });
Sound.break = Sound.register({ fileName: 'break.mp3' });
Sound.quickFixes = Sound.register({ fileName: 'quickFixes.mp3' });
Sound.taskCompleted = Sound.register({ fileName: 'taskCompleted.mp3' });
Sound.taskFailed = Sound.register({ fileName: 'taskFailed.mp3' });
Sound.terminalBell = Sound.register({ fileName: 'terminalBell.mp3' });
Sound.diffLineInserted = Sound.register({ fileName: 'diffLineInserted.mp3' });
Sound.diffLineDeleted = Sound.register({ fileName: 'diffLineDeleted.mp3' });
Sound.diffLineModified = Sound.register({ fileName: 'diffLineModified.mp3' });
Sound.chatRequestSent = Sound.register({ fileName: 'chatRequestSent.mp3' });
Sound.chatResponseReceived1 = Sound.register({ fileName: 'chatResponseReceived1.mp3' });
Sound.chatResponseReceived2 = Sound.register({ fileName: 'chatResponseReceived2.mp3' });
Sound.chatResponseReceived3 = Sound.register({ fileName: 'chatResponseReceived3.mp3' });
Sound.chatResponseReceived4 = Sound.register({ fileName: 'chatResponseReceived4.mp3' });
Sound.clear = Sound.register({ fileName: 'clear.mp3' });
Sound.save = Sound.register({ fileName: 'save.mp3' });
Sound.format = Sound.register({ fileName: 'format.mp3' });
Sound.voiceRecordingStarted = Sound.register({ fileName: 'voiceRecordingStarted.mp3' });
Sound.voiceRecordingStopped = Sound.register({ fileName: 'voiceRecordingStopped.mp3' });
Sound.progress = Sound.register({ fileName: 'progress.mp3' });
export class SoundSource {
    constructor(randomOneOf) {
        this.randomOneOf = randomOneOf;
    }
}
export class AccessibilitySignal {
    constructor(sound, name, legacySoundSettingsKey, settingsKey, legacyAnnouncementSettingsKey, announcementMessage) {
        this.sound = sound;
        this.name = name;
        this.legacySoundSettingsKey = legacySoundSettingsKey;
        this.settingsKey = settingsKey;
        this.legacyAnnouncementSettingsKey = legacyAnnouncementSettingsKey;
        this.announcementMessage = announcementMessage;
    }
    static register(options) {
        const soundSource = new SoundSource('randomOneOf' in options.sound ? options.sound.randomOneOf : [options.sound]);
        const signal = new AccessibilitySignal(soundSource, options.name, options.legacySoundSettingsKey, options.settingsKey, options.legacyAnnouncementSettingsKey, options.announcementMessage);
        AccessibilitySignal._signals.add(signal);
        return signal;
    }
}
AccessibilitySignal._signals = new Set();
AccessibilitySignal.errorAtPosition = AccessibilitySignal.register({
    name: localize('accessibilitySignals.positionHasError.name', 'Error at Position'),
    sound: Sound.error,
    announcementMessage: localize('accessibility.signals.positionHasError', 'Error'),
    settingsKey: 'accessibility.signals.positionHasError',
});
AccessibilitySignal.warningAtPosition = AccessibilitySignal.register({
    name: localize('accessibilitySignals.positionHasWarning.name', 'Warning at Position'),
    sound: Sound.warning,
    announcementMessage: localize('accessibility.signals.positionHasWarning', 'Warning'),
    settingsKey: 'accessibility.signals.positionHasWarning',
});
AccessibilitySignal.errorOnLine = AccessibilitySignal.register({
    name: localize('accessibilitySignals.lineHasError.name', 'Error on Line'),
    sound: Sound.error,
    legacySoundSettingsKey: 'audioCues.lineHasError',
    legacyAnnouncementSettingsKey: "accessibility.alert.error" /* AccessibilityAlertSettingId.Error */,
    announcementMessage: localize('accessibility.signals.lineHasError', 'Error on Line'),
    settingsKey: 'accessibility.signals.lineHasError',
});
AccessibilitySignal.warningOnLine = AccessibilitySignal.register({
    name: localize('accessibilitySignals.lineHasWarning.name', 'Warning on Line'),
    sound: Sound.warning,
    legacySoundSettingsKey: 'audioCues.lineHasWarning',
    legacyAnnouncementSettingsKey: "accessibility.alert.warning" /* AccessibilityAlertSettingId.Warning */,
    announcementMessage: localize('accessibility.signals.lineHasWarning', 'Warning on Line'),
    settingsKey: 'accessibility.signals.lineHasWarning',
});
AccessibilitySignal.foldedArea = AccessibilitySignal.register({
    name: localize('accessibilitySignals.lineHasFoldedArea.name', 'Folded Area on Line'),
    sound: Sound.foldedArea,
    legacySoundSettingsKey: 'audioCues.lineHasFoldedArea',
    legacyAnnouncementSettingsKey: "accessibility.alert.foldedArea" /* AccessibilityAlertSettingId.FoldedArea */,
    announcementMessage: localize('accessibility.signals.lineHasFoldedArea', 'Folded'),
    settingsKey: 'accessibility.signals.lineHasFoldedArea',
});
AccessibilitySignal.break = AccessibilitySignal.register({
    name: localize('accessibilitySignals.lineHasBreakpoint.name', 'Breakpoint on Line'),
    sound: Sound.break,
    legacySoundSettingsKey: 'audioCues.lineHasBreakpoint',
    legacyAnnouncementSettingsKey: "accessibility.alert.breakpoint" /* AccessibilityAlertSettingId.Breakpoint */,
    announcementMessage: localize('accessibility.signals.lineHasBreakpoint', 'Breakpoint'),
    settingsKey: 'accessibility.signals.lineHasBreakpoint',
});
AccessibilitySignal.inlineSuggestion = AccessibilitySignal.register({
    name: localize('accessibilitySignals.lineHasInlineSuggestion.name', 'Inline Suggestion on Line'),
    sound: Sound.quickFixes,
    legacySoundSettingsKey: 'audioCues.lineHasInlineSuggestion',
    settingsKey: 'accessibility.signals.lineHasInlineSuggestion',
});
AccessibilitySignal.terminalQuickFix = AccessibilitySignal.register({
    name: localize('accessibilitySignals.terminalQuickFix.name', 'Terminal Quick Fix'),
    sound: Sound.quickFixes,
    legacySoundSettingsKey: 'audioCues.terminalQuickFix',
    legacyAnnouncementSettingsKey: "accessibility.alert.terminalQuickFix" /* AccessibilityAlertSettingId.TerminalQuickFix */,
    announcementMessage: localize('accessibility.signals.terminalQuickFix', 'Quick Fix'),
    settingsKey: 'accessibility.signals.terminalQuickFix',
});
AccessibilitySignal.onDebugBreak = AccessibilitySignal.register({
    name: localize('accessibilitySignals.onDebugBreak.name', 'Debugger Stopped on Breakpoint'),
    sound: Sound.break,
    legacySoundSettingsKey: 'audioCues.onDebugBreak',
    legacyAnnouncementSettingsKey: "accessibility.alert.onDebugBreak" /* AccessibilityAlertSettingId.OnDebugBreak */,
    announcementMessage: localize('accessibility.signals.onDebugBreak', 'Breakpoint'),
    settingsKey: 'accessibility.signals.onDebugBreak',
});
AccessibilitySignal.noInlayHints = AccessibilitySignal.register({
    name: localize('accessibilitySignals.noInlayHints', 'No Inlay Hints on Line'),
    sound: Sound.error,
    legacySoundSettingsKey: 'audioCues.noInlayHints',
    legacyAnnouncementSettingsKey: "accessibility.alert.noInlayHints" /* AccessibilityAlertSettingId.NoInlayHints */,
    announcementMessage: localize('accessibility.signals.noInlayHints', 'No Inlay Hints'),
    settingsKey: 'accessibility.signals.noInlayHints',
});
AccessibilitySignal.taskCompleted = AccessibilitySignal.register({
    name: localize('accessibilitySignals.taskCompleted', 'Task Completed'),
    sound: Sound.taskCompleted,
    legacySoundSettingsKey: 'audioCues.taskCompleted',
    legacyAnnouncementSettingsKey: "accessibility.alert.taskCompleted" /* AccessibilityAlertSettingId.TaskCompleted */,
    announcementMessage: localize('accessibility.signals.taskCompleted', 'Task Completed'),
    settingsKey: 'accessibility.signals.taskCompleted',
});
AccessibilitySignal.taskFailed = AccessibilitySignal.register({
    name: localize('accessibilitySignals.taskFailed', 'Task Failed'),
    sound: Sound.taskFailed,
    legacySoundSettingsKey: 'audioCues.taskFailed',
    legacyAnnouncementSettingsKey: "accessibility.alert.taskFailed" /* AccessibilityAlertSettingId.TaskFailed */,
    announcementMessage: localize('accessibility.signals.taskFailed', 'Task Failed'),
    settingsKey: 'accessibility.signals.taskFailed',
});
AccessibilitySignal.terminalCommandFailed = AccessibilitySignal.register({
    name: localize('accessibilitySignals.terminalCommandFailed', 'Terminal Command Failed'),
    sound: Sound.error,
    legacySoundSettingsKey: 'audioCues.terminalCommandFailed',
    legacyAnnouncementSettingsKey: "accessibility.alert.terminalCommandFailed" /* AccessibilityAlertSettingId.TerminalCommandFailed */,
    announcementMessage: localize('accessibility.signals.terminalCommandFailed', 'Command Failed'),
    settingsKey: 'accessibility.signals.terminalCommandFailed',
});
AccessibilitySignal.terminalBell = AccessibilitySignal.register({
    name: localize('accessibilitySignals.terminalBell', 'Terminal Bell'),
    sound: Sound.terminalBell,
    legacySoundSettingsKey: 'audioCues.terminalBell',
    legacyAnnouncementSettingsKey: "accessibility.alert.terminalBell" /* AccessibilityAlertSettingId.TerminalBell */,
    announcementMessage: localize('accessibility.signals.terminalBell', 'Terminal Bell'),
    settingsKey: 'accessibility.signals.terminalBell',
});
AccessibilitySignal.notebookCellCompleted = AccessibilitySignal.register({
    name: localize('accessibilitySignals.notebookCellCompleted', 'Notebook Cell Completed'),
    sound: Sound.taskCompleted,
    legacySoundSettingsKey: 'audioCues.notebookCellCompleted',
    legacyAnnouncementSettingsKey: "accessibility.alert.notebookCellCompleted" /* AccessibilityAlertSettingId.NotebookCellCompleted */,
    announcementMessage: localize('accessibility.signals.notebookCellCompleted', 'Notebook Cell Completed'),
    settingsKey: 'accessibility.signals.notebookCellCompleted',
});
AccessibilitySignal.notebookCellFailed = AccessibilitySignal.register({
    name: localize('accessibilitySignals.notebookCellFailed', 'Notebook Cell Failed'),
    sound: Sound.taskFailed,
    legacySoundSettingsKey: 'audioCues.notebookCellFailed',
    legacyAnnouncementSettingsKey: "accessibility.alert.notebookCellFailed" /* AccessibilityAlertSettingId.NotebookCellFailed */,
    announcementMessage: localize('accessibility.signals.notebookCellFailed', 'Notebook Cell Failed'),
    settingsKey: 'accessibility.signals.notebookCellFailed',
});
AccessibilitySignal.diffLineInserted = AccessibilitySignal.register({
    name: localize('accessibilitySignals.diffLineInserted', 'Diff Line Inserted'),
    sound: Sound.diffLineInserted,
    legacySoundSettingsKey: 'audioCues.diffLineInserted',
    settingsKey: 'accessibility.signals.diffLineInserted',
});
AccessibilitySignal.diffLineDeleted = AccessibilitySignal.register({
    name: localize('accessibilitySignals.diffLineDeleted', 'Diff Line Deleted'),
    sound: Sound.diffLineDeleted,
    legacySoundSettingsKey: 'audioCues.diffLineDeleted',
    settingsKey: 'accessibility.signals.diffLineDeleted',
});
AccessibilitySignal.diffLineModified = AccessibilitySignal.register({
    name: localize('accessibilitySignals.diffLineModified', 'Diff Line Modified'),
    sound: Sound.diffLineModified,
    legacySoundSettingsKey: 'audioCues.diffLineModified',
    settingsKey: 'accessibility.signals.diffLineModified',
});
AccessibilitySignal.chatRequestSent = AccessibilitySignal.register({
    name: localize('accessibilitySignals.chatRequestSent', 'Chat Request Sent'),
    sound: Sound.chatRequestSent,
    legacySoundSettingsKey: 'audioCues.chatRequestSent',
    legacyAnnouncementSettingsKey: "accessibility.alert.chatRequestSent" /* AccessibilityAlertSettingId.ChatRequestSent */,
    announcementMessage: localize('accessibility.signals.chatRequestSent', 'Chat Request Sent'),
    settingsKey: 'accessibility.signals.chatRequestSent',
});
AccessibilitySignal.chatResponseReceived = AccessibilitySignal.register({
    name: localize('accessibilitySignals.chatResponseReceived', 'Chat Response Received'),
    legacySoundSettingsKey: 'audioCues.chatResponseReceived',
    sound: {
        randomOneOf: [
            Sound.chatResponseReceived1,
            Sound.chatResponseReceived2,
            Sound.chatResponseReceived3,
            Sound.chatResponseReceived4
        ]
    },
    settingsKey: 'accessibility.signals.chatResponseReceived'
});
AccessibilitySignal.progress = AccessibilitySignal.register({
    name: localize('accessibilitySignals.progress', 'Progress'),
    sound: Sound.progress,
    legacySoundSettingsKey: 'audioCues.chatResponsePending',
    legacyAnnouncementSettingsKey: "accessibility.alert.chatResponseProgress" /* AccessibilityAlertSettingId.Progress */,
    announcementMessage: localize('accessibility.signals.progress', 'Progress'),
    settingsKey: 'accessibility.signals.progress'
});
AccessibilitySignal.clear = AccessibilitySignal.register({
    name: localize('accessibilitySignals.clear', 'Clear'),
    sound: Sound.clear,
    legacySoundSettingsKey: 'audioCues.clear',
    legacyAnnouncementSettingsKey: "accessibility.alert.clear" /* AccessibilityAlertSettingId.Clear */,
    announcementMessage: localize('accessibility.signals.clear', 'Clear'),
    settingsKey: 'accessibility.signals.clear'
});
AccessibilitySignal.save = AccessibilitySignal.register({
    name: localize('accessibilitySignals.save', 'Save'),
    sound: Sound.save,
    legacySoundSettingsKey: 'audioCues.save',
    legacyAnnouncementSettingsKey: "accessibility.alert.save" /* AccessibilityAlertSettingId.Save */,
    announcementMessage: localize('accessibility.signals.save', 'Save'),
    settingsKey: 'accessibility.signals.save'
});
AccessibilitySignal.format = AccessibilitySignal.register({
    name: localize('accessibilitySignals.format', 'Format'),
    sound: Sound.format,
    legacySoundSettingsKey: 'audioCues.format',
    legacyAnnouncementSettingsKey: "accessibility.alert.format" /* AccessibilityAlertSettingId.Format */,
    announcementMessage: localize('accessibility.signals.format', 'Format'),
    settingsKey: 'accessibility.signals.format'
});
AccessibilitySignal.voiceRecordingStarted = AccessibilitySignal.register({
    name: localize('accessibilitySignals.voiceRecordingStarted', 'Voice Recording Started'),
    sound: Sound.voiceRecordingStarted,
    legacySoundSettingsKey: 'audioCues.voiceRecordingStarted',
    settingsKey: 'accessibility.signals.voiceRecordingStarted'
});
AccessibilitySignal.voiceRecordingStopped = AccessibilitySignal.register({
    name: localize('accessibilitySignals.voiceRecordingStopped', 'Voice Recording Stopped'),
    sound: Sound.voiceRecordingStopped,
    legacySoundSettingsKey: 'audioCues.voiceRecordingStopped',
    settingsKey: 'accessibility.signals.voiceRecordingStopped'
});
