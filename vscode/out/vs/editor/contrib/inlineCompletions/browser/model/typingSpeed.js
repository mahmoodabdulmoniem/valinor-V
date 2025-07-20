/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { sum } from '../../../../../base/common/arrays.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
/**
 * Tracks typing speed as average milliseconds between keystrokes.
 * Higher values indicate slower typing.
 */
export class TypingInterval extends Disposable {
    // Configuration constants
    static { this.MAX_SESSION_GAP_MS = 3_000; } // 3 seconds max gap between keystrokes in a session
    static { this.MIN_SESSION_DURATION_MS = 1_000; } // Minimum session duration to consider
    static { this.SESSION_HISTORY_LIMIT = 50; } // Keep last 50 sessions for calculation
    static { this.TYPING_SPEED_WINDOW_MS = 300_000; } // 5 minutes window for speed calculation
    static { this.MIN_CHARS_FOR_RELIABLE_SPEED = 20; } // Minimum characters needed for reliable speed calculation
    /**
     * Gets the current typing interval as average milliseconds between keystrokes
     * and the number of characters involved in the computation.
     * Higher interval values indicate slower typing.
     * Returns { interval: 0, characterCount: 0 } if no typing data is available.
     */
    getTypingInterval() {
        if (this._cacheInvalidated || this._cachedTypingIntervalResult === null) {
            this._cachedTypingIntervalResult = this._calculateTypingInterval();
            this._cacheInvalidated = false;
        }
        return this._cachedTypingIntervalResult;
    }
    constructor(_textModel) {
        super();
        this._textModel = _textModel;
        this._typingSessions = [];
        this._currentSession = null;
        this._lastChangeTime = 0;
        this._cachedTypingIntervalResult = null;
        this._cacheInvalidated = true;
        this._register(this._textModel.onDidChangeContent(e => this._updateTypingSpeed(e)));
    }
    _updateTypingSpeed(change) {
        const now = Date.now();
        const characterCount = this._calculateEffectiveCharacterCount(change);
        // If too much time has passed since last change, start a new session
        if (this._currentSession && (now - this._lastChangeTime) > TypingInterval.MAX_SESSION_GAP_MS) {
            this._finalizeCurrentSession();
        }
        // Start new session if none exists
        if (!this._currentSession) {
            this._currentSession = {
                startTime: now,
                endTime: now,
                characterCount: 0
            };
        }
        // Update current session
        this._currentSession.endTime = now;
        this._currentSession.characterCount += characterCount;
        this._lastChangeTime = now;
        this._cacheInvalidated = true;
    }
    _calculateEffectiveCharacterCount(change) {
        const actualCharCount = this._getActualCharacterCount(change);
        // If this is actual user typing, count all characters
        if (this._isUserTyping(change)) {
            return actualCharCount;
        }
        // For all other actions (paste, suggestions, etc.), count as 1 regardless of size
        return actualCharCount > 0 ? 1 : 0;
    }
    _getActualCharacterCount(change) {
        let totalChars = 0;
        for (const c of change.changes) {
            // Count characters added or removed (use the larger of the two)
            totalChars += Math.max(c.text.length, c.rangeLength);
        }
        return totalChars;
    }
    _isUserTyping(change) {
        // If no detailed reasons, assume user typing
        if (!change.detailedReasons || change.detailedReasons.length === 0) {
            return true;
        }
        // Check if any of the reasons indicate actual user typing
        for (const reason of change.detailedReasons) {
            if (this._isUserTypingReason(reason)) {
                return true;
            }
        }
        return false;
    }
    _isUserTypingReason(reason) {
        // Handle undo/redo - not considered user typing
        if (reason.metadata.isUndoing || reason.metadata.isRedoing) {
            return false;
        }
        // Handle different source types
        switch (reason.metadata.source) {
            case 'cursor': {
                // Direct user input via cursor
                const kind = reason.metadata.kind;
                return kind === 'type' || kind === 'compositionType' || kind === 'compositionEnd';
            }
            default:
                // All other sources (paste, suggestions, code actions, etc.) are not user typing
                return false;
        }
    }
    _finalizeCurrentSession() {
        if (!this._currentSession) {
            return;
        }
        const sessionDuration = this._currentSession.endTime - this._currentSession.startTime;
        // Only keep sessions that meet minimum duration and have actual content
        if (sessionDuration >= TypingInterval.MIN_SESSION_DURATION_MS && this._currentSession.characterCount > 0) {
            this._typingSessions.push(this._currentSession);
            // Limit session history
            if (this._typingSessions.length > TypingInterval.SESSION_HISTORY_LIMIT) {
                this._typingSessions.shift();
            }
        }
        this._currentSession = null;
    }
    _calculateTypingInterval() {
        // Finalize current session for calculation
        if (this._currentSession) {
            const tempSession = { ...this._currentSession };
            const sessionDuration = tempSession.endTime - tempSession.startTime;
            if (sessionDuration >= TypingInterval.MIN_SESSION_DURATION_MS && tempSession.characterCount > 0) {
                const allSessions = [...this._typingSessions, tempSession];
                return this._calculateSpeedFromSessions(allSessions);
            }
        }
        return this._calculateSpeedFromSessions(this._typingSessions);
    }
    _calculateSpeedFromSessions(sessions) {
        if (sessions.length === 0) {
            return { averageInterval: 0, characterCount: 0 };
        }
        // Sort sessions by recency (most recent first) to ensure we get the most recent sessions
        const sortedSessions = [...sessions].sort((a, b) => b.endTime - a.endTime);
        // First, try the standard window
        const cutoffTime = Date.now() - TypingInterval.TYPING_SPEED_WINDOW_MS;
        const recentSessions = sortedSessions.filter(session => session.endTime > cutoffTime);
        const olderSessions = sortedSessions.splice(recentSessions.length);
        let totalChars = sum(recentSessions.map(session => session.characterCount));
        // If we don't have enough characters in the standard window, expand to include older sessions
        for (let i = 0; i < olderSessions.length && totalChars < TypingInterval.MIN_CHARS_FOR_RELIABLE_SPEED; i++) {
            recentSessions.push(olderSessions[i]);
            totalChars += olderSessions[i].characterCount;
        }
        const totalTime = sum(recentSessions.map(session => session.endTime - session.startTime));
        if (totalTime === 0 || totalChars <= 1) {
            return { averageInterval: 0, characterCount: totalChars };
        }
        // Calculate average milliseconds between keystrokes
        const keystrokeIntervals = Math.max(1, totalChars - 1);
        const avgMsBetweenKeystrokes = totalTime / keystrokeIntervals;
        return {
            averageInterval: Math.round(avgMsBetweenKeystrokes),
            characterCount: totalChars
        };
    }
    /**
     * Reset all typing speed data
     */
    reset() {
        this._typingSessions.length = 0;
        this._currentSession = null;
        this._lastChangeTime = 0;
        this._cachedTypingIntervalResult = null;
        this._cacheInvalidated = true;
    }
    dispose() {
        this._finalizeCurrentSession();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwaW5nU3BlZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvbW9kZWwvdHlwaW5nU3BlZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQWVyRTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sY0FBZSxTQUFRLFVBQVU7SUFRN0MsMEJBQTBCO2FBQ0YsdUJBQWtCLEdBQUcsS0FBSyxBQUFSLENBQVMsR0FBQyxvREFBb0Q7YUFDaEYsNEJBQXVCLEdBQUcsS0FBSyxBQUFSLENBQVMsR0FBQyx1Q0FBdUM7YUFDeEUsMEJBQXFCLEdBQUcsRUFBRSxBQUFMLENBQU0sR0FBQyx3Q0FBd0M7YUFDcEUsMkJBQXNCLEdBQUcsT0FBTyxBQUFWLENBQVcsR0FBQyx5Q0FBeUM7YUFDM0UsaUNBQTRCLEdBQUcsRUFBRSxBQUFMLENBQU0sR0FBQywyREFBMkQ7SUFFdEg7Ozs7O09BS0c7SUFDSSxpQkFBaUI7UUFDdkIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDLDJCQUEyQixLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3pFLElBQUksQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNuRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDO1FBQ2hDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQywyQkFBMkIsQ0FBQztJQUN6QyxDQUFDO0lBRUQsWUFBNkIsVUFBc0I7UUFDbEQsS0FBSyxFQUFFLENBQUM7UUFEb0IsZUFBVSxHQUFWLFVBQVUs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