/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { addDisposableListener } from '../../../base/browser/dom.js';
import { CachedFunction } from '../../../base/common/cache.js';
import { getStructuralKey } from '../../../base/common/equals.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { FileAccess } from '../../../base/common/network.js';
import { derived, observableFromEvent, ValueWithChangeEventFromObservable } from '../../../base/common/observable.js';
import { localize } from '../../../nls.js';
import { IAccessibilityService } from '../../accessibility/common/accessibility.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { observableConfigValue } from '../../observable/common/platformObservableUtils.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
export const IAccessibilitySignalService = createDecorator('accessibilitySignalService');
/** Make sure you understand the doc comments of the method you want to call when using this token! */
export const AcknowledgeDocCommentsToken = Symbol('AcknowledgeDocCommentsToken');
let AccessibilitySignalService = class AccessibilitySignalService extends Disposable {
    constructor(configurationService, accessibilityService, telemetryService) {
        super();
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this.telemetryService = telemetryService;
        this.sounds = new Map();
        this.screenReaderAttached = observableFromEvent(this, this.accessibilityService.onDidChangeScreenReaderOptimized, () => /** @description accessibilityService.onDidChangeScreenReaderOptimized */ this.accessibilityService.isScreenReaderOptimized());
        this.sentTelemetry = new Set();
        this.playingSounds = new Set();
        this._signalConfigValue = new CachedFunction((signal) => observableConfigValue(signal.settingsKey, { sound: 'off', announcement: 'off' }, this.configurationService));
        this._signalEnabledState = new CachedFunction({ getCacheKey: getStructuralKey }, (arg) => {
            return derived(reader => {
                /** @description sound enabled */
                const setting = this._signalConfigValue.get(arg.signal).read(reader);
                if (arg.modality === 'sound' || arg.modality === undefined) {
                    if (arg.signal.managesOwnEnablement || checkEnabledState(setting.sound, () => this.screenReaderAttached.read(reader), arg.userGesture)) {
                        return true;
                    }
                }
                if (arg.modality === 'announcement' || arg.modality === undefined) {
                    if (checkEnabledState(setting.announcement, () => this.screenReaderAttached.read(reader), arg.userGesture)) {
                        return true;
                    }
                }
                return false;
            }).recomputeInitiallyAndOnChange(this._store);
        });
    }
    getEnabledState(signal, userGesture, modality) {
        return new ValueWithChangeEventFromObservable(this._signalEnabledState.get({ signal, userGesture, modality }));
    }
    async playSignal(signal, options = {}) {
        const shouldPlayAnnouncement = options.modality === 'announcement' || options.modality === undefined;
        const announcementMessage = options.customAlertMessage ?? signal.announcementMessage;
        if (shouldPlayAnnouncement && this.isAnnouncementEnabled(signal, options.userGesture) && announcementMessage) {
            this.accessibilityService.status(announcementMessage);
        }
        const shouldPlaySound = options.modality === 'sound' || options.modality === undefined;
        if (shouldPlaySound && this.isSoundEnabled(signal, options.userGesture)) {
            this.sendSignalTelemetry(signal, options.source);
            await this.playSound(signal.sound.getSound(), options.allowManyInParallel);
        }
    }
    async playSignals(signals) {
        for (const signal of signals) {
            this.sendSignalTelemetry('signal' in signal ? signal.signal : signal, 'source' in signal ? signal.source : undefined);
        }
        const signalArray = signals.map(s => 'signal' in s ? s.signal : s);
        const announcements = signalArray.filter(signal => this.isAnnouncementEnabled(signal)).map(s => s.announcementMessage);
        if (announcements.length) {
            this.accessibilityService.status(announcements.join(', '));
        }
        // Some sounds are reused. Don't play the same sound twice.
        const sounds = new Set(signalArray.filter(signal => this.isSoundEnabled(signal)).map(signal => signal.sound.getSound()));
        await Promise.all(Array.from(sounds).map(sound => this.playSound(sound, true)));
    }
    sendSignalTelemetry(signal, source) {
        const isScreenReaderOptimized = this.accessibilityService.isScreenReaderOptimized();
        const key = signal.name + (source ? `::${source}` : '') + (isScreenReaderOptimized ? '{screenReaderOptimized}' : '');
        // Only send once per user session
        if (this.sentTelemetry.has(key) || this.getVolumeInPercent() === 0) {
            return;
        }
        this.sentTelemetry.add(key);
        this.telemetryService.publicLog2('signal.played', {
            signal: signal.name,
            source: source ?? '',
            isScreenReaderOptimized,
        });
    }
    getVolumeInPercent() {
        const volume = this.configurationService.getValue('accessibility.signalOptions.volume');
        if (typeof volume !== 'number') {
            return 50;
        }
        return Math.max(Math.min(volume, 100), 0);
    }
    async playSound(sound, allowManyInParallel = false) {
        if (!allowManyInParallel && this.playingSounds.has(sound)) {
            return;
        }
        this.playingSounds.add(sound);
        const url = FileAccess.asBrowserUri(`vs/platform/accessibilitySignal/browser/media/${sound.fileName}`).toString(true);
        try {
            const sound = this.sounds.get(url);
            if (sound) {
                sound.volume = this.getVolumeInPercent() / 100;
                sound.currentTime = 0;
                await sound.play();
            }
            else {
                const playedSound = await playAudio(url, this.getVolumeInPercent() / 100);
                this.sounds.set(url, playedSound);
            }
        }
        catch (e) {
            if (!e.message.includes('play() can only be initiated by a user gesture')) {
                // tracking this issue in #178642, no need to spam the console
                console.error('Error while playing sound', e);
            }
        }
        finally {
            this.playingSounds.delete(sound);
        }
    }
    playSignalLoop(signal, milliseconds) {
        let playing = true;
        const playSound = () => {
            if (playing) {
                this.playSignal(signal, { allowManyInParallel: true }).finally(() => {
                    setTimeout(() => {
                        if (playing) {
                            playSound();
                        }
                    }, milliseconds);
                });
            }
        };
        playSound();
        return toDisposable(() => playing = false);
    }
    isAnnouncementEnabled(signal, userGesture) {
        if (!signal.announcementMessage) {
            return false;
        }
        return this._signalEnabledState.get({ signal, userGesture: !!userGesture, modality: 'announcement' }).get();
    }
    isSoundEnabled(signal, userGesture) {
        return this._signalEnabledState.get({ signal, userGesture: !!userGesture, modality: 'sound' }).get();
    }
    onSoundEnabledChanged(signal) {
        return this.getEnabledState(signal, false).onDidChange;
    }
    getDelayMs(signal, modality, mode) {
        if (!this.configurationService.getValue('accessibility.signalOptions.debouncePositionChanges')) {
            return 0;
        }
        let value;
        if (signal.name === AccessibilitySignal.errorAtPosition.name && mode === 'positional') {
            value = this.configurationService.getValue('accessibility.signalOptions.experimental.delays.errorAtPosition');
        }
        else if (signal.name === AccessibilitySignal.warningAtPosition.name && mode === 'positional') {
            value = this.configurationService.getValue('accessibility.signalOptions.experimental.delays.warningAtPosition');
        }
        else {
            value = this.configurationService.getValue('accessibility.signalOptions.experimental.delays.general');
        }
        return modality === 'sound' ? value.sound : value.announcement;
    }
};
AccessibilitySignalService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IAccessibilityService),
    __param(2, ITelemetryService)
], AccessibilitySignalService);
export { AccessibilitySignalService };
function checkEnabledState(state, getScreenReaderAttached, isTriggeredByUserGesture) {
    return state === 'on' || state === 'always' || (state === 'auto' && getScreenReaderAttached()) || state === 'userGesture' && isTriggeredByUserGesture;
}
/**
 * Play the given audio url.
 * @volume value between 0 and 1
 */
async function playAudio(url, volume) {
    const disposables = new DisposableStore();
    try {
        return await doPlayAudio(url, volume, disposables);
    }
    finally {
        disposables.dispose();
    }
}
function doPlayAudio(url, volume, disposables) {
    return new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.volume = volume;
        disposables.add(addDisposableListener(audio, 'ended', () => {
            resolve(audio);
        }));
        disposables.add(addDisposableListener(audio, 'error', (e) => {
            // When the error event fires, ended might not be called
            reject(e.error);
        }));
        audio.play().catch(e => {
            // When play fails, the error event is not fired.
            reject(e);
        });
    });
}
/**
 * Corresponds to the audio files in ./media.
*/
export class Sound {
    static register(options) {
        const sound = new Sound(options.fileName);
        return sound;
    }
    static { this.error = Sound.register({ fileName: 'error.mp3' }); }
    static { this.warning = Sound.register({ fileName: 'warning.mp3' }); }
    static { this.success = Sound.register({ fileName: 'success.mp3' }); }
    static { this.foldedArea = Sound.register({ fileName: 'foldedAreas.mp3' }); }
    static { this.break = Sound.register({ fileName: 'break.mp3' }); }
    static { this.quickFixes = Sound.register({ fileName: 'quickFixes.mp3' }); }
    static { this.taskCompleted = Sound.register({ fileName: 'taskCompleted.mp3' }); }
    static { this.taskFailed = Sound.register({ fileName: 'taskFailed.mp3' }); }
    static { this.terminalBell = Sound.register({ fileName: 'terminalBell.mp3' }); }
    static { this.diffLineInserted = Sound.register({ fileName: 'diffLineInserted.mp3' }); }
    static { this.diffLineDeleted = Sound.register({ fileName: 'diffLineDeleted.mp3' }); }
    static { this.diffLineModified = Sound.register({ fileName: 'diffLineModified.mp3' }); }
    static { this.requestSent = Sound.register({ fileName: 'requestSent.mp3' }); }
    static { this.responseReceived1 = Sound.register({ fileName: 'responseReceived1.mp3' }); }
    static { this.responseReceived2 = Sound.register({ fileName: 'responseReceived2.mp3' }); }
    static { this.responseReceived3 = Sound.register({ fileName: 'responseReceived3.mp3' }); }
    static { this.responseReceived4 = Sound.register({ fileName: 'responseReceived4.mp3' }); }
    static { this.clear = Sound.register({ fileName: 'clear.mp3' }); }
    static { this.save = Sound.register({ fileName: 'save.mp3' }); }
    static { this.format = Sound.register({ fileName: 'format.mp3' }); }
    static { this.voiceRecordingStarted = Sound.register({ fileName: 'voiceRecordingStarted.mp3' }); }
    static { this.voiceRecordingStopped = Sound.register({ fileName: 'voiceRecordingStopped.mp3' }); }
    static { this.progress = Sound.register({ fileName: 'progress.mp3' }); }
    static { this.chatEditModifiedFile = Sound.register({ fileName: 'chatEditModifiedFile.mp3' }); }
    static { this.editsKept = Sound.register({ fileName: 'editsKept.mp3' }); }
    static { this.editsUndone = Sound.register({ fileName: 'editsUndone.mp3' }); }
    static { this.nextEditSuggestion = Sound.register({ fileName: 'nextEditSuggestion.mp3' }); }
    static { this.terminalCommandSucceeded = Sound.register({ fileName: 'terminalCommandSucceeded.mp3' }); }
    static { this.chatUserActionRequired = Sound.register({ fileName: 'chatUserActionRequired.mp3' }); }
    static { this.codeActionTriggered = Sound.register({ fileName: 'codeActionTriggered.mp3' }); }
    static { this.codeActionApplied = Sound.register({ fileName: 'codeActionApplied.mp3' }); }
    constructor(fileName) {
        this.fileName = fileName;
    }
}
export class SoundSource {
    constructor(randomOneOf) {
        this.randomOneOf = randomOneOf;
    }
    getSound(deterministic = false) {
        if (deterministic || this.randomOneOf.length === 1) {
            return this.randomOneOf[0];
        }
        else {
            const index = Math.floor(Math.random() * this.randomOneOf.length);
            return this.randomOneOf[index];
        }
    }
}
export class AccessibilitySignal {
    constructor(sound, name, legacySoundSettingsKey, settingsKey, legacyAnnouncementSettingsKey, announcementMessage, managesOwnEnablement = false) {
        this.sound = sound;
        this.name = name;
        this.legacySoundSettingsKey = legacySoundSettingsKey;
        this.settingsKey = settingsKey;
        this.legacyAnnouncementSettingsKey = legacyAnnouncementSettingsKey;
        this.announcementMessage = announcementMessage;
        this.managesOwnEnablement = managesOwnEnablement;
    }
    static { this._signals = new Set(); }
    static register(options) {
        const soundSource = new SoundSource('randomOneOf' in options.sound ? options.sound.randomOneOf : [options.sound]);
        const signal = new AccessibilitySignal(soundSource, options.name, options.legacySoundSettingsKey, options.settingsKey, options.legacyAnnouncementSettingsKey, options.announcementMessage, options.managesOwnEnablement);
        AccessibilitySignal._signals.add(signal);
        return signal;
    }
    static get allAccessibilitySignals() {
        return [...this._signals];
    }
    static { this.errorAtPosition = AccessibilitySignal.register({
        name: localize('accessibilitySignals.positionHasError.name', 'Error at Position'),
        sound: Sound.error,
        announcementMessage: localize('accessibility.signals.positionHasError', 'Error'),
        settingsKey: 'accessibility.signals.positionHasError',
        delaySettingsKey: 'accessibility.signalOptions.delays.errorAtPosition'
    }); }
    static { this.warningAtPosition = AccessibilitySignal.register({
        name: localize('accessibilitySignals.positionHasWarning.name', 'Warning at Position'),
        sound: Sound.warning,
        announcementMessage: localize('accessibility.signals.positionHasWarning', 'Warning'),
        settingsKey: 'accessibility.signals.positionHasWarning',
        delaySettingsKey: 'accessibility.signalOptions.delays.warningAtPosition'
    }); }
    static { this.errorOnLine = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasError.name', 'Error on Line'),
        sound: Sound.error,
        legacySoundSettingsKey: 'audioCues.lineHasError',
        legacyAnnouncementSettingsKey: 'accessibility.alert.error',
        announcementMessage: localize('accessibility.signals.lineHasError', 'Error on Line'),
        settingsKey: 'accessibility.signals.lineHasError',
    }); }
    static { this.warningOnLine = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasWarning.name', 'Warning on Line'),
        sound: Sound.warning,
        legacySoundSettingsKey: 'audioCues.lineHasWarning',
        legacyAnnouncementSettingsKey: 'accessibility.alert.warning',
        announcementMessage: localize('accessibility.signals.lineHasWarning', 'Warning on Line'),
        settingsKey: 'accessibility.signals.lineHasWarning',
    }); }
    static { this.foldedArea = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasFoldedArea.name', 'Folded Area on Line'),
        sound: Sound.foldedArea,
        legacySoundSettingsKey: 'audioCues.lineHasFoldedArea',
        legacyAnnouncementSettingsKey: 'accessibility.alert.foldedArea',
        announcementMessage: localize('accessibility.signals.lineHasFoldedArea', 'Folded'),
        settingsKey: 'accessibility.signals.lineHasFoldedArea',
    }); }
    static { this.break = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasBreakpoint.name', 'Breakpoint on Line'),
        sound: Sound.break,
        legacySoundSettingsKey: 'audioCues.lineHasBreakpoint',
        legacyAnnouncementSettingsKey: 'accessibility.alert.breakpoint',
        announcementMessage: localize('accessibility.signals.lineHasBreakpoint', 'Breakpoint'),
        settingsKey: 'accessibility.signals.lineHasBreakpoint',
    }); }
    static { this.inlineSuggestion = AccessibilitySignal.register({
        name: localize('accessibilitySignals.lineHasInlineSuggestion.name', 'Inline Suggestion on Line'),
        sound: Sound.quickFixes,
        legacySoundSettingsKey: 'audioCues.lineHasInlineSuggestion',
        settingsKey: 'accessibility.signals.lineHasInlineSuggestion',
    }); }
    static { this.nextEditSuggestion = AccessibilitySignal.register({
        name: localize('accessibilitySignals.nextEditSuggestion.name', 'Next Edit Suggestion on Line'),
        sound: Sound.nextEditSuggestion,
        legacySoundSettingsKey: 'audioCues.nextEditSuggestion',
        settingsKey: 'accessibility.signals.nextEditSuggestion',
        announcementMessage: localize('accessibility.signals.nextEditSuggestion', 'Next Edit Suggestion'),
    }); }
    static { this.terminalQuickFix = AccessibilitySignal.register({
        name: localize('accessibilitySignals.terminalQuickFix.name', 'Terminal Quick Fix'),
        sound: Sound.quickFixes,
        legacySoundSettingsKey: 'audioCues.terminalQuickFix',
        legacyAnnouncementSettingsKey: 'accessibility.alert.terminalQuickFix',
        announcementMessage: localize('accessibility.signals.terminalQuickFix', 'Quick Fix'),
        settingsKey: 'accessibility.signals.terminalQuickFix',
    }); }
    static { this.onDebugBreak = AccessibilitySignal.register({
        name: localize('accessibilitySignals.onDebugBreak.name', 'Debugger Stopped on Breakpoint'),
        sound: Sound.break,
        legacySoundSettingsKey: 'audioCues.onDebugBreak',
        legacyAnnouncementSettingsKey: 'accessibility.alert.onDebugBreak',
        announcementMessage: localize('accessibility.signals.onDebugBreak', 'Breakpoint'),
        settingsKey: 'accessibility.signals.onDebugBreak',
    }); }
    static { this.noInlayHints = AccessibilitySignal.register({
        name: localize('accessibilitySignals.noInlayHints', 'No Inlay Hints on Line'),
        sound: Sound.error,
        legacySoundSettingsKey: 'audioCues.noInlayHints',
        legacyAnnouncementSettingsKey: 'accessibility.alert.noInlayHints',
        announcementMessage: localize('accessibility.signals.noInlayHints', 'No Inlay Hints'),
        settingsKey: 'accessibility.signals.noInlayHints',
    }); }
    static { this.taskCompleted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.taskCompleted', 'Task Completed'),
        sound: Sound.taskCompleted,
        legacySoundSettingsKey: 'audioCues.taskCompleted',
        legacyAnnouncementSettingsKey: 'accessibility.alert.taskCompleted',
        announcementMessage: localize('accessibility.signals.taskCompleted', 'Task Completed'),
        settingsKey: 'accessibility.signals.taskCompleted',
    }); }
    static { this.taskFailed = AccessibilitySignal.register({
        name: localize('accessibilitySignals.taskFailed', 'Task Failed'),
        sound: Sound.taskFailed,
        legacySoundSettingsKey: 'audioCues.taskFailed',
        legacyAnnouncementSettingsKey: 'accessibility.alert.taskFailed',
        announcementMessage: localize('accessibility.signals.taskFailed', 'Task Failed'),
        settingsKey: 'accessibility.signals.taskFailed',
    }); }
    static { this.terminalCommandFailed = AccessibilitySignal.register({
        name: localize('accessibilitySignals.terminalCommandFailed', 'Terminal Command Failed'),
        sound: Sound.error,
        legacySoundSettingsKey: 'audioCues.terminalCommandFailed',
        legacyAnnouncementSettingsKey: 'accessibility.alert.terminalCommandFailed',
        announcementMessage: localize('accessibility.signals.terminalCommandFailed', 'Command Failed'),
        settingsKey: 'accessibility.signals.terminalCommandFailed',
    }); }
    static { this.terminalCommandSucceeded = AccessibilitySignal.register({
        name: localize('accessibilitySignals.terminalCommandSucceeded', 'Terminal Command Succeeded'),
        sound: Sound.terminalCommandSucceeded,
        announcementMessage: localize('accessibility.signals.terminalCommandSucceeded', 'Command Succeeded'),
        settingsKey: 'accessibility.signals.terminalCommandSucceeded',
    }); }
    static { this.terminalBell = AccessibilitySignal.register({
        name: localize('accessibilitySignals.terminalBell', 'Terminal Bell'),
        sound: Sound.terminalBell,
        legacySoundSettingsKey: 'audioCues.terminalBell',
        legacyAnnouncementSettingsKey: 'accessibility.alert.terminalBell',
        announcementMessage: localize('accessibility.signals.terminalBell', 'Terminal Bell'),
        settingsKey: 'accessibility.signals.terminalBell',
    }); }
    static { this.notebookCellCompleted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.notebookCellCompleted', 'Notebook Cell Completed'),
        sound: Sound.taskCompleted,
        legacySoundSettingsKey: 'audioCues.notebookCellCompleted',
        legacyAnnouncementSettingsKey: 'accessibility.alert.notebookCellCompleted',
        announcementMessage: localize('accessibility.signals.notebookCellCompleted', 'Notebook Cell Completed'),
        settingsKey: 'accessibility.signals.notebookCellCompleted',
    }); }
    static { this.notebookCellFailed = AccessibilitySignal.register({
        name: localize('accessibilitySignals.notebookCellFailed', 'Notebook Cell Failed'),
        sound: Sound.taskFailed,
        legacySoundSettingsKey: 'audioCues.notebookCellFailed',
        legacyAnnouncementSettingsKey: 'accessibility.alert.notebookCellFailed',
        announcementMessage: localize('accessibility.signals.notebookCellFailed', 'Notebook Cell Failed'),
        settingsKey: 'accessibility.signals.notebookCellFailed',
    }); }
    static { this.diffLineInserted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.diffLineInserted', 'Diff Line Inserted'),
        sound: Sound.diffLineInserted,
        legacySoundSettingsKey: 'audioCues.diffLineInserted',
        settingsKey: 'accessibility.signals.diffLineInserted',
    }); }
    static { this.diffLineDeleted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.diffLineDeleted', 'Diff Line Deleted'),
        sound: Sound.diffLineDeleted,
        legacySoundSettingsKey: 'audioCues.diffLineDeleted',
        settingsKey: 'accessibility.signals.diffLineDeleted',
    }); }
    static { this.diffLineModified = AccessibilitySignal.register({
        name: localize('accessibilitySignals.diffLineModified', 'Diff Line Modified'),
        sound: Sound.diffLineModified,
        legacySoundSettingsKey: 'audioCues.diffLineModified',
        settingsKey: 'accessibility.signals.diffLineModified',
    }); }
    static { this.chatEditModifiedFile = AccessibilitySignal.register({
        name: localize('accessibilitySignals.chatEditModifiedFile', 'Chat Edit Modified File'),
        sound: Sound.chatEditModifiedFile,
        announcementMessage: localize('accessibility.signals.chatEditModifiedFile', 'File Modified from Chat Edits'),
        settingsKey: 'accessibility.signals.chatEditModifiedFile',
    }); }
    static { this.chatRequestSent = AccessibilitySignal.register({
        name: localize('accessibilitySignals.chatRequestSent', 'Chat Request Sent'),
        sound: Sound.requestSent,
        legacySoundSettingsKey: 'audioCues.chatRequestSent',
        legacyAnnouncementSettingsKey: 'accessibility.alert.chatRequestSent',
        announcementMessage: localize('accessibility.signals.chatRequestSent', 'Chat Request Sent'),
        settingsKey: 'accessibility.signals.chatRequestSent',
    }); }
    static { this.chatResponseReceived = AccessibilitySignal.register({
        name: localize('accessibilitySignals.chatResponseReceived', 'Chat Response Received'),
        legacySoundSettingsKey: 'audioCues.chatResponseReceived',
        sound: {
            randomOneOf: [
                Sound.responseReceived1,
                Sound.responseReceived2,
                Sound.responseReceived3,
                Sound.responseReceived4
            ]
        },
        settingsKey: 'accessibility.signals.chatResponseReceived'
    }); }
    static { this.codeActionTriggered = AccessibilitySignal.register({
        name: localize('accessibilitySignals.codeActionRequestTriggered', 'Code Action Request Triggered'),
        sound: Sound.codeActionTriggered,
        legacySoundSettingsKey: 'audioCues.codeActionRequestTriggered',
        legacyAnnouncementSettingsKey: 'accessibility.alert.codeActionRequestTriggered',
        announcementMessage: localize('accessibility.signals.codeActionRequestTriggered', 'Code Action Request Triggered'),
        settingsKey: 'accessibility.signals.codeActionTriggered',
    }); }
    static { this.codeActionApplied = AccessibilitySignal.register({
        name: localize('accessibilitySignals.codeActionApplied', 'Code Action Applied'),
        legacySoundSettingsKey: 'audioCues.codeActionApplied',
        sound: Sound.codeActionApplied,
        settingsKey: 'accessibility.signals.codeActionApplied'
    }); }
    static { this.progress = AccessibilitySignal.register({
        name: localize('accessibilitySignals.progress', 'Progress'),
        sound: Sound.progress,
        legacySoundSettingsKey: 'audioCues.chatResponsePending',
        legacyAnnouncementSettingsKey: 'accessibility.alert.progress',
        announcementMessage: localize('accessibility.signals.progress', 'Progress'),
        settingsKey: 'accessibility.signals.progress'
    }); }
    static { this.clear = AccessibilitySignal.register({
        name: localize('accessibilitySignals.clear', 'Clear'),
        sound: Sound.clear,
        legacySoundSettingsKey: 'audioCues.clear',
        legacyAnnouncementSettingsKey: 'accessibility.alert.clear',
        announcementMessage: localize('accessibility.signals.clear', 'Clear'),
        settingsKey: 'accessibility.signals.clear'
    }); }
    static { this.save = AccessibilitySignal.register({
        name: localize('accessibilitySignals.save', 'Save'),
        sound: Sound.save,
        legacySoundSettingsKey: 'audioCues.save',
        legacyAnnouncementSettingsKey: 'accessibility.alert.save',
        announcementMessage: localize('accessibility.signals.save', 'Save'),
        settingsKey: 'accessibility.signals.save'
    }); }
    static { this.format = AccessibilitySignal.register({
        name: localize('accessibilitySignals.format', 'Format'),
        sound: Sound.format,
        legacySoundSettingsKey: 'audioCues.format',
        legacyAnnouncementSettingsKey: 'accessibility.alert.format',
        announcementMessage: localize('accessibility.signals.format', 'Format'),
        settingsKey: 'accessibility.signals.format'
    }); }
    static { this.voiceRecordingStarted = AccessibilitySignal.register({
        name: localize('accessibilitySignals.voiceRecordingStarted', 'Voice Recording Started'),
        sound: Sound.voiceRecordingStarted,
        legacySoundSettingsKey: 'audioCues.voiceRecordingStarted',
        settingsKey: 'accessibility.signals.voiceRecordingStarted'
    }); }
    static { this.voiceRecordingStopped = AccessibilitySignal.register({
        name: localize('accessibilitySignals.voiceRecordingStopped', 'Voice Recording Stopped'),
        sound: Sound.voiceRecordingStopped,
        legacySoundSettingsKey: 'audioCues.voiceRecordingStopped',
        settingsKey: 'accessibility.signals.voiceRecordingStopped'
    }); }
    static { this.editsKept = AccessibilitySignal.register({
        name: localize('accessibilitySignals.editsKept', 'Edits Kept'),
        sound: Sound.editsKept,
        announcementMessage: localize('accessibility.signals.editsKept', 'Edits Kept'),
        settingsKey: 'accessibility.signals.editsKept',
    }); }
    static { this.editsUndone = AccessibilitySignal.register({
        name: localize('accessibilitySignals.editsUndone', 'Undo Edits'),
        sound: Sound.editsUndone,
        announcementMessage: localize('accessibility.signals.editsUndone', 'Edits Undone'),
        settingsKey: 'accessibility.signals.editsUndone',
    }); }
    static { this.chatUserActionRequired = AccessibilitySignal.register({
        name: localize('accessibilitySignals.chatUserActionRequired', 'Chat User Action Required'),
        sound: Sound.chatUserActionRequired,
        announcementMessage: localize('accessibility.signals.chatUserActionRequired', 'Chat User Action Required'),
        settingsKey: 'accessibility.signals.chatUserActionRequired',
        managesOwnEnablement: true
    }); }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNpZ25hbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjY2Vzc2liaWxpdHlTaWduYWwvYnJvd3Nlci9hY2Nlc3NpYmlsaXR5U2lnbmFsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0csT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXhFLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGVBQWUsQ0FBOEIsNEJBQTRCLENBQUMsQ0FBQztBQXdCdEgs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