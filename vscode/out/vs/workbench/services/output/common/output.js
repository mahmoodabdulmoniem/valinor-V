/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
/**
 * Mime type used by the output editor.
 */
export const OUTPUT_MIME = 'text/x-code-output';
/**
 * Id used by the output editor.
 */
export const OUTPUT_MODE_ID = 'Log';
/**
 * Mime type used by the log output editor.
 */
export const LOG_MIME = 'text/x-code-log-output';
/**
 * Id used by the log output editor.
 */
export const LOG_MODE_ID = 'log';
/**
 * Output view id
 */
export const OUTPUT_VIEW_ID = 'workbench.panel.output';
export const CONTEXT_IN_OUTPUT = new RawContextKey('inOutput', false);
export const CONTEXT_ACTIVE_FILE_OUTPUT = new RawContextKey('activeLogOutput', false);
export const CONTEXT_ACTIVE_LOG_FILE_OUTPUT = new RawContextKey('activeLogOutput.isLog', false);
export const CONTEXT_ACTIVE_OUTPUT_LEVEL_SETTABLE = new RawContextKey('activeLogOutput.levelSettable', false);
export const CONTEXT_ACTIVE_OUTPUT_LEVEL = new RawContextKey('activeLogOutput.level', '');
export const CONTEXT_ACTIVE_OUTPUT_LEVEL_IS_DEFAULT = new RawContextKey('activeLogOutput.levelIsDefault', false);
export const CONTEXT_OUTPUT_SCROLL_LOCK = new RawContextKey(`outputView.scrollLock`, false);
export const ACTIVE_OUTPUT_CHANNEL_CONTEXT = new RawContextKey('activeOutputChannel', '');
export const SHOW_TRACE_FILTER_CONTEXT = new RawContextKey('output.filter.trace', true);
export const SHOW_DEBUG_FILTER_CONTEXT = new RawContextKey('output.filter.debug', true);
export const SHOW_INFO_FILTER_CONTEXT = new RawContextKey('output.filter.info', true);
export const SHOW_WARNING_FILTER_CONTEXT = new RawContextKey('output.filter.warning', true);
export const SHOW_ERROR_FILTER_CONTEXT = new RawContextKey('output.filter.error', true);
export const OUTPUT_FILTER_FOCUS_CONTEXT = new RawContextKey('outputFilterFocus', false);
export const HIDE_CATEGORY_FILTER_CONTEXT = new RawContextKey('output.filter.categories', '');
export const IOutputService = createDecorator('outputService');
export var OutputChannelUpdateMode;
(function (OutputChannelUpdateMode) {
    OutputChannelUpdateMode[OutputChannelUpdateMode["Append"] = 1] = "Append";
    OutputChannelUpdateMode[OutputChannelUpdateMode["Replace"] = 2] = "Replace";
    OutputChannelUpdateMode[OutputChannelUpdateMode["Clear"] = 3] = "Clear";
})(OutputChannelUpdateMode || (OutputChannelUpdateMode = {}));
export const Extensions = {
    OutputChannels: 'workbench.contributions.outputChannels'
};
export function isSingleSourceOutputChannelDescriptor(descriptor) {
    return !!descriptor.source && !Array.isArray(descriptor.source);
}
export function isMultiSourceOutputChannelDescriptor(descriptor) {
    return Array.isArray(descriptor.source);
}
class OutputChannelRegistry extends Disposable {
    constructor() {
        super(...arguments);
        this.channels = new Map();
        this._onDidRegisterChannel = this._register(new Emitter());
        this.onDidRegisterChannel = this._onDidRegisterChannel.event;
        this._onDidRemoveChannel = this._register(new Emitter());
        this.onDidRemoveChannel = this._onDidRemoveChannel.event;
        this._onDidUpdateChannelFiles = this._register(new Emitter());
        this.onDidUpdateChannelSources = this._onDidUpdateChannelFiles.event;
    }
    registerChannel(descriptor) {
        if (!this.channels.has(descriptor.id)) {
            this.channels.set(descriptor.id, descriptor);
            this._onDidRegisterChannel.fire(descriptor.id);
        }
    }
    getChannels() {
        const result = [];
        this.channels.forEach(value => result.push(value));
        return result;
    }
    getChannel(id) {
        return this.channels.get(id);
    }
    updateChannelSources(id, sources) {
        const channel = this.channels.get(id);
        if (channel && isMultiSourceOutputChannelDescriptor(channel)) {
            channel.source = sources;
            this._onDidUpdateChannelFiles.fire(channel);
        }
    }
    removeChannel(id) {
        const channel = this.channels.get(id);
        if (channel) {
            this.channels.delete(id);
            this._onDidRemoveChannel.fire(channel);
        }
    }
}
Registry.add(Extensions.OutputChannels, new OutputChannelRegistry());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvb3V0cHV0L2NvbW1vbi9vdXRwdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU1RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRzdGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxvQkFBb0IsQ0FBQztBQUVoRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUM7QUFFcEM7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQUM7QUFFakQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDO0FBRWpDOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLHdCQUF3QixDQUFDO0FBRXZELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLElBQUksYUFBYSxDQUFVLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUMvRSxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxpQkFBaUIsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUMvRixNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLGFBQWEsQ0FBVSx1QkFBdUIsRUFBRSxLQUFL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