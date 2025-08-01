"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalTasks = void 0;
const vscode = __importStar(require("vscode"));
class TerminalTasks {
    constructor() {
        this._disposables = [];
        this._statusBarItems = [];
        this.initializeTerminalTasks();
        this.initializeStatusBarTasks();
    }
    initializeTerminalTasks() {
        // Register custom task provider
        this._disposables.push(vscode.tasks.registerTaskProvider('valinor', {
            provideTasks: () => {
                return this.getValinorTasks();
            },
            resolveTask: (task) => {
                return task;
            }
        }));
        // Register task execution handlers
        this._disposables.push(vscode.tasks.onDidStartTask((event) => {
            if (event.execution.task.source === 'Valinor Studio') {
                this.onTaskStarted(event.execution.task);
            }
        }), vscode.tasks.onDidEndTask((event) => {
            if (event.execution.task.source === 'Valinor Studio') {
                this.onTaskEnded(event.execution.task);
            }
        }));
    }
    getValinorTasks() {
        const tasks = [];
        // Pricing Validation Task
        const pricingTask = new vscode.Task({ type: 'valinor', task: 'validate-pricing' }, vscode.TaskScope.Workspace, 'Validate Pricing', 'Valinor Studio', new vscode.ShellExecution('node', ['-e', 'console.log("Running pricing validation..."); setTimeout(() => console.log("Pricing validation complete!"), 2000);']), ['$valinor-pricing']);
        pricingTask.group = vscode.TaskGroup.Build;
        pricingTask.presentationOptions = {
            echo: true,
            reveal: vscode.TaskRevealKind.Always,
            focus: false,
            panel: vscode.TaskPanelKind.Shared,
            showReuseMessage: true,
            clear: false
        };
        tasks.push(pricingTask);
        // Compliance Check Task
        const complianceTask = new vscode.Task({ type: 'valinor', task: 'check-compliance' }, vscode.TaskScope.Workspace, 'Check Compliance', 'Valinor Studio', new vscode.ShellExecution('node', ['-e', 'console.log("Checking proposal compliance..."); setTimeout(() => console.log("Compliance check complete!"), 1500);']), ['$valinor-compliance']);
        complianceTask.group = vscode.TaskGroup.Build;
        complianceTask.presentationOptions = {
            echo: true,
            reveal: vscode.TaskRevealKind.Always,
            focus: false,
            panel: vscode.TaskPanelKind.Shared,
            showReuseMessage: true,
            clear: false
        };
        tasks.push(complianceTask);
        // Generate Proposal Task
        const generateTask = new vscode.Task({ type: 'valinor', task: 'generate-proposal' }, vscode.TaskScope.Workspace, 'Generate Proposal', 'Valinor Studio', new vscode.ShellExecution('node', ['-e', 'console.log("Generating proposal sections..."); setTimeout(() => console.log("Proposal generation complete!"), 3000);']), ['$valinor-generate']);
        generateTask.group = vscode.TaskGroup.Build;
        generateTask.presentationOptions = {
            echo: true,
            reveal: vscode.TaskRevealKind.Always,
            focus: false,
            panel: vscode.TaskPanelKind.Shared,
            showReuseMessage: true,
            clear: false
        };
        tasks.push(generateTask);
        // Export Proposal Task
        const exportTask = new vscode.Task({ type: 'valinor', task: 'export-proposal' }, vscode.TaskScope.Workspace, 'Export Proposal', 'Valinor Studio', new vscode.ShellExecution('node', ['-e', 'console.log("Exporting proposal..."); setTimeout(() => console.log("Proposal exported successfully!"), 1000);']), ['$valinor-export']);
        exportTask.group = vscode.TaskGroup.Build;
        exportTask.presentationOptions = {
            echo: true,
            reveal: vscode.TaskRevealKind.Always,
            focus: false,
            panel: vscode.TaskPanelKind.Shared,
            showReuseMessage: true,
            clear: false
        };
        tasks.push(exportTask);
        return tasks;
    }
    initializeStatusBarTasks() {
        // Pricing Validation Status Bar Item
        const pricingItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 95);
        pricingItem.text = '💲 Validate Pricing';
        pricingItem.command = 'valinorStudio.validatePricingTask';
        pricingItem.tooltip = 'Run Live Pricing Validation';
        pricingItem.show();
        this._statusBarItems.push(pricingItem);
        // Compliance Check Status Bar Item
        const complianceItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 94);
        complianceItem.text = '✅ Check Compliance';
        complianceItem.command = 'valinorStudio.checkComplianceTask';
        complianceItem.tooltip = 'Run Compliance Check';
        complianceItem.show();
        this._statusBarItems.push(complianceItem);
        // Generate Proposal Status Bar Item
        const generateItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 93);
        generateItem.text = '⚡ Generate Proposal';
        generateItem.command = 'valinorStudio.generateProposalTask';
        generateItem.tooltip = 'Generate Complete Proposal';
        generateItem.show();
        this._statusBarItems.push(generateItem);
        // Export Proposal Status Bar Item
        const exportItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 92);
        exportItem.text = '📤 Export Proposal';
        exportItem.command = 'valinorStudio.exportProposalTask';
        exportItem.tooltip = 'Export Proposal to PDF/Word';
        exportItem.show();
        this._statusBarItems.push(exportItem);
        // Update status bar based on active editor
        this.updateStatusBarForEditor();
        vscode.window.onDidChangeActiveTextEditor(() => {
            this.updateStatusBarForEditor();
        });
    }
    updateStatusBarForEditor() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            // Hide task-specific items when no editor is active
            this._statusBarItems[1].hide(); // Compliance
            this._statusBarItems[2].hide(); // Generate
            this._statusBarItems[3].hide(); // Export
            return;
        }
        const isMarkdown = editor.document.languageId === 'markdown';
        const isProposal = editor.document.fileName.includes('proposal.md');
        // Show/hide items based on context
        this._statusBarItems[0].show(); // Pricing - always visible
        if (isMarkdown && isProposal) {
            this._statusBarItems[1].show(); // Compliance
            this._statusBarItems[2].show(); // Generate
            this._statusBarItems[3].show(); // Export
        }
        else {
            this._statusBarItems[1].hide(); // Compliance
            this._statusBarItems[2].hide(); // Generate
            this._statusBarItems[3].hide(); // Export
        }
    }
    onTaskStarted(task) {
        vscode.window.showInformationMessage(`🚀 Started: ${task.name}`);
        // Update status bar to show task is running
        const statusBarItem = this._statusBarItems.find(item => item.command === this.getCommandForTask(task.name));
        if (statusBarItem) {
            statusBarItem.text = `⏳ ${task.name}`;
            statusBarItem.tooltip = `${task.name} - Running...`;
        }
    }
    onTaskEnded(task) {
        vscode.window.showInformationMessage(`✅ Completed: ${task.name}`);
        // Reset status bar
        const statusBarItem = this._statusBarItems.find(item => item.command === this.getCommandForTask(task.name));
        if (statusBarItem) {
            statusBarItem.text = this.getOriginalTextForTask(task.name);
            statusBarItem.tooltip = this.getOriginalTooltipForTask(task.name);
        }
    }
    getCommandForTask(taskName) {
        switch (taskName) {
            case 'Validate Pricing':
                return 'valinorStudio.validatePricingTask';
            case 'Check Compliance':
                return 'valinorStudio.checkComplianceTask';
            case 'Generate Proposal':
                return 'valinorStudio.generateProposalTask';
            case 'Export Proposal':
                return 'valinorStudio.exportProposalTask';
            default:
                return '';
        }
    }
    getOriginalTextForTask(taskName) {
        switch (taskName) {
            case 'Validate Pricing':
                return '💲 Validate Pricing';
            case 'Check Compliance':
                return '✅ Check Compliance';
            case 'Generate Proposal':
                return '⚡ Generate Proposal';
            case 'Export Proposal':
                return '📤 Export Proposal';
            default:
                return taskName;
        }
    }
    getOriginalTooltipForTask(taskName) {
        switch (taskName) {
            case 'Validate Pricing':
                return 'Run Live Pricing Validation';
            case 'Check Compliance':
                return 'Run Compliance Check';
            case 'Generate Proposal':
                return 'Generate Complete Proposal';
            case 'Export Proposal':
                return 'Export Proposal to PDF/Word';
            default:
                return taskName;
        }
    }
    async executeTask(taskName) {
        try {
            const tasks = this.getValinorTasks();
            const task = tasks.find(t => t.name === taskName);
            if (task) {
                await vscode.tasks.executeTask(task);
            }
            else {
                vscode.window.showErrorMessage(`Task not found: ${taskName}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error executing task: ${error}`);
        }
    }
    dispose() {
        this._disposables.forEach(disposable => disposable.dispose());
        this._statusBarItems.forEach(item => item.dispose());
    }
}
exports.TerminalTasks = TerminalTasks;
//# sourceMappingURL=terminal-tasks.js.map