/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Primarily driven by the shell integration feature, a terminal capability is the mechanism for
 * progressively enhancing various features that may not be supported in all terminals/shells.
 */
export var TerminalCapability;
(function (TerminalCapability) {
    /**
     * The terminal can reliably detect the current working directory as soon as the change happens
     * within the buffer.
     */
    TerminalCapability[TerminalCapability["CwdDetection"] = 0] = "CwdDetection";
    /**
     * The terminal can reliably detect the current working directory when requested.
     */
    TerminalCapability[TerminalCapability["NaiveCwdDetection"] = 1] = "NaiveCwdDetection";
    /**
     * The terminal can reliably identify prompts, commands and command outputs within the buffer.
     */
    TerminalCapability[TerminalCapability["CommandDetection"] = 2] = "CommandDetection";
    /**
     * The terminal can often identify prompts, commands and command outputs within the buffer. It
     * may not be so good at remembering the position of commands that ran in the past. This state
     * may be enabled when something goes wrong or when using conpty for example.
     */
    TerminalCapability[TerminalCapability["PartialCommandDetection"] = 3] = "PartialCommandDetection";
    /**
     * Manages buffer marks that can be used for terminal navigation. The source of
     * the request (task, debug, etc) provides an ID, optional marker, hoverMessage, and hidden property. When
     * hidden is not provided, a generic decoration is added to the buffer and overview ruler.
     */
    TerminalCapability[TerminalCapability["BufferMarkDetection"] = 4] = "BufferMarkDetection";
    /**
     * The terminal can detect the latest environment of user's current shell.
     */
    TerminalCapability[TerminalCapability["ShellEnvDetection"] = 5] = "ShellEnvDetection";
})(TerminalCapability || (TerminalCapability = {}));
export var CommandInvalidationReason;
(function (CommandInvalidationReason) {
    CommandInvalidationReason["Windows"] = "windows";
    CommandInvalidationReason["NoProblemsReported"] = "noProblemsReported";
})(CommandInvalidationReason || (CommandInvalidationReason = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FwYWJpbGl0aWVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vY2FwYWJpbGl0aWVzL2NhcGFiaWxpdGllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRzs7O0dBR0c7QUFDSCxNQUFNLENBQU4sSUFBa0Isa0JBaUNqQjtBQWpDRCxXQUFrQixrQkFBa0I7SUFDbkM7OztPQUdHO0lBQ0gsMkVBQVksQ0FBQTtJQUNaOztPQUVHO0lBQ0gscUZBQWlCLENBQUE7SUFDakI7O09BRUc7SUFDSCxtRkFBZ0IsQ0FBQTtJQUNoQjs7OztPQUlHO0lBQ0gsaUdBQXVCLENBQUE7SUFFdkI7Ozs7T0FJRztJQUNILHlGQUFtQixDQUFBO0lBRW5COztPQUVHO0lBQ0gscUZBQWlCLENBQUE7QUFFbEIsQ0FBQyxFQWpDaUIsa0JBQWtCLEtBQWxCLGtCQUFrQixRQWlDbkM7QUE4R0QsTUFBTSxDQUFOLElBQWtCLHlCQUdqQjtBQUhELFdBQWtCLHlCQUF5QjtJQUMxQyxnREFBbUIsQ0FBQTtJQUNuQixzRUFBeUMsQ0FBQTtBQUMxQyxDQUFDLEVBSGlCLHlCQUF5QixLQUF6Qix5QkFBeUIsUUFHMUMifQ==