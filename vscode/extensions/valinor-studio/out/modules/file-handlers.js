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
exports.FileHandlers = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class FileHandlers {
    constructor() {
        this._disposables = [];
        this._fileWatchers = [];
        this.initializeFileHandlers();
        this.initializeFileWatchers();
    }
    initializeFileHandlers() {
        // Register custom file handlers
        this._disposables.push(vscode.workspace.registerTextDocumentContentProvider('valinor', {
            provideTextDocumentContent: (uri) => {
                return this.handleValinorUri(uri);
            }
        }));
        // Register file system provider for custom schemes
        this._disposables.push(vscode.workspace.registerFileSystemProvider('valinor', {
            readFile: (uri) => {
                return this.readValinorFile(uri);
            },
            writeFile: (uri, content, options) => {
                return this.writeValinorFile(uri, content, options);
            },
            delete: (uri) => {
                return this.deleteValinorFile(uri);
            },
            rename: (oldUri, newUri, options) => {
                return this.renameValinorFile(oldUri, newUri, options);
            },
            stat: (uri) => {
                return this.statValinorFile(uri);
            },
            readDirectory: (uri) => {
                return this.readValinorDirectory(uri);
            },
            createDirectory: (uri) => {
                return this.createValinorDirectory(uri);
            },
            watch: (uri, options) => {
                return this.watchValinorFile(uri, options);
            },
            onDidChangeFile: new vscode.EventEmitter().event
        }));
    }
    initializeFileWatchers() {
        // Watch for new files in workspace
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceFolder, '**/*'));
            watcher.onDidCreate((uri) => {
                this.handleFileCreated(uri);
            });
            watcher.onDidChange((uri) => {
                this.handleFileChanged(uri);
            });
            watcher.onDidDelete((uri) => {
                this.handleFileDeleted(uri);
            });
            this._fileWatchers.push(watcher);
        }
    }
    async handleFileCreated(uri) {
        const fileName = path.basename(uri.fsPath);
        const fileExt = path.extname(uri.fsPath).toLowerCase();
        // Handle different file types
        switch (fileExt) {
            case '.pdf':
                await this.handlePDFCreated(uri.fsPath);
                break;
            case '.doc':
            case '.docx':
                await this.handleWordDocumentCreated(uri.fsPath);
                break;
            case '.txt':
                await this.handleTextFileCreated(uri.fsPath);
                break;
            case '.json':
                await this.handleJSONCreated(uri.fsPath);
                break;
            case '.xml':
                await this.handleXMLCreated(uri.fsPath);
                break;
        }
    }
    async handlePDFCreated(filePath) {
        try {
            const fileName = path.basename(filePath);
            if (fileName.toLowerCase().includes('rfp') || fileName.toLowerCase().includes('solicitation')) {
                const answer = await vscode.window.showInformationMessage(`📄 RFP PDF detected: ${fileName}\nWould you like to extract and analyze this RFP?`, 'Extract RFP', 'Skip');
                if (answer === 'Extract RFP') {
                    await vscode.commands.executeCommand('valinorStudio.extractRFPFromPDF', filePath);
                }
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ Error handling PDF: ${error}`);
        }
    }
    async handleWordDocumentCreated(filePath) {
        try {
            const fileName = path.basename(filePath);
            const answer = await vscode.window.showInformationMessage(`📝 Word document detected: ${fileName}\nWould you like to convert this to markdown?`, 'Convert to Markdown', 'Skip');
            if (answer === 'Convert to Markdown') {
                await vscode.commands.executeCommand('valinorStudio.convertWordToMarkdown', filePath);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ Error handling Word document: ${error}`);
        }
    }
    async handleTextFileCreated(filePath) {
        try {
            const fileName = path.basename(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            // Check if it contains RFP-like content
            if (content.toLowerCase().includes('request for proposal') ||
                content.toLowerCase().includes('solicitation') ||
                content.toLowerCase().includes('notice id')) {
                const answer = await vscode.window.showInformationMessage(`📄 RFP text detected in: ${fileName}\nWould you like to analyze this content?`, 'Analyze RFP', 'Skip');
                if (answer === 'Analyze RFP') {
                    await vscode.commands.executeCommand('valinorStudio.analyzeRFPText', filePath);
                }
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ Error handling text file: ${error}`);
        }
    }
    async handleJSONCreated(filePath) {
        try {
            const fileName = path.basename(filePath);
            if (fileName.toLowerCase().includes('contract') || fileName.toLowerCase().includes('proposal')) {
                await vscode.window.showInformationMessage(`📄 Contract/Proposal JSON detected: ${fileName}\nUse "Import RFP" to analyze this data.`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ Error handling JSON file: ${error}`);
        }
    }
    async handleXMLCreated(filePath) {
        try {
            const fileName = path.basename(filePath);
            if (fileName.toLowerCase().includes('contract') || fileName.toLowerCase().includes('proposal')) {
                await vscode.window.showInformationMessage(`📄 Contract/Proposal XML detected: ${fileName}\nUse "Import RFP" to analyze this data.`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ Error handling XML file: ${error}`);
        }
    }
    async handleFileChanged(uri) {
        // Handle file changes if needed
        const fileName = path.basename(uri.fsPath);
        if (fileName === 'proposal.md') {
            // Proposal file changed - could trigger auto-save or validation
        }
    }
    async handleFileDeleted(uri) {
        // Handle file deletions if needed
        const fileName = path.basename(uri.fsPath);
        if (fileName === 'proposal.md') {
            // Proposal file deleted - could show warning or offer to restore
        }
    }
    handleValinorUri(uri) {
        switch (uri.path) {
            case '/welcome':
                return this.getWelcomeContent();
            case '/help':
                return this.getHelpContent();
            case '/templates':
                return this.getTemplatesContent();
            default:
                return 'Content not found';
        }
    }
    getWelcomeContent() {
        return `# Welcome to Valinor Studio

## Getting Started

1. **Import RFP**: Use the Import RFP command to analyze government contracts
2. **Generate Content**: Right-click on section headers to generate AI-powered content
3. **Validate Pricing**: Use the pricing validation features to ensure competitiveness
4. **Collaborate**: Add comments and track version history

## Quick Actions

- **Alt+Cmd+I**: Quick Import RFP
- **Alt+Cmd+G**: Generate current section
- **Ctrl+Shift+V**: Open chat
- **Alt+Cmd+V**: Validate pricing

Happy proposing! 🎯`;
    }
    getHelpContent() {
        return `# Valinor Studio Help

## Features

- **AI-Powered Analysis**: Get insights from government contracts
- **Content Generation**: Generate proposal sections with AI
- **Pricing Validation**: Validate pricing against market data
- **Collaboration Tools**: Comments, version history, and team features
- **Compliance Checking**: Ensure your proposals meet requirements

## Support

For more help, visit our documentation or use the chat feature.`;
    }
    getTemplatesContent() {
        return `# Proposal Templates

## Available Templates

1. **Standard Template**: Basic government proposal structure
2. **Technical Template**: Technical proposal with detailed specifications
3. **Past Performance Template**: Focus on experience and past work
4. **Pricing Template**: Detailed pricing and cost analysis

Select a template to get started with your proposal.`;
    }
    readValinorFile(uri) {
        return Buffer.from('Content not found', 'utf8');
    }
    writeValinorFile(uri, content, options) {
        // Implementation for writing valinor files
    }
    deleteValinorFile(uri) {
        // Implementation for deleting valinor files
    }
    renameValinorFile(oldUri, newUri, options) {
        // Implementation for renaming valinor files
    }
    statValinorFile(uri) {
        return {
            type: vscode.FileType.File,
            ctime: Date.now(),
            mtime: Date.now(),
            size: 0
        };
    }
    readValinorDirectory(uri) {
        return [
            ['welcome', vscode.FileType.File],
            ['help', vscode.FileType.File],
            ['templates', vscode.FileType.File]
        ];
    }
    createValinorDirectory(uri) {
        // Implementation for creating valinor directories
    }
    watchValinorFile(uri, options) {
        return new vscode.Disposable(() => { });
    }
    async createProposalFromTemplate(templateName) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Please open a workspace folder first');
            return;
        }
        const proposalPath = path.join(workspaceFolder.uri.fsPath, 'proposal.md');
        try {
            // Check if proposal.md already exists
            if (await vscode.workspace.fs.stat(vscode.Uri.file(proposalPath))) {
                const answer = await vscode.window.showWarningMessage('proposal.md already exists. Do you want to open it?', 'Open Existing', 'Create New');
                if (answer === 'Open Existing') {
                    const document = await vscode.workspace.openTextDocument(proposalPath);
                    await vscode.window.showTextDocument(document);
                    return;
                }
            }
            // Create new proposal.md with template
            const template = this.getTemplateContent(templateName);
            await vscode.workspace.fs.writeFile(vscode.Uri.file(proposalPath), Buffer.from(template, 'utf8'));
            const document = await vscode.workspace.openTextDocument(proposalPath);
            await vscode.window.showTextDocument(document);
            vscode.window.showInformationMessage('✅ New proposal.md created successfully!');
        }
        catch (error) {
            vscode.window.showErrorMessage(`❌ Error creating proposal: ${error}`);
        }
    }
    getTemplateContent(templateName) {
        switch (templateName) {
            case 'technical':
                return this.getTechnicalTemplate();
            case 'past-performance':
                return this.getPastPerformanceTemplate();
            case 'pricing':
                return this.getPricingTemplate();
            default:
                return this.getStandardTemplate();
        }
    }
    getTechnicalTemplate() {
        return `# Technical Proposal

## Executive Summary

[Your executive summary will be generated here]

## Technical Approach

### System Architecture
[System architecture description will be generated here]

### Technical Solution
[Technical solution details will be generated here]

### Implementation Plan
[Implementation plan will be generated here]

## Requirements Analysis

[Requirements analysis will be generated here]

## Technical Specifications

[Technical specifications will be generated here]

## Quality Assurance

[Quality assurance plan will be generated here]

## Risk Management

[Risk management plan will be generated here]

---
*Generated by Valinor Studio - AI-Powered Government Proposal Assistant*`;
    }
    getPastPerformanceTemplate() {
        return `# Past Performance Proposal

## Executive Summary

[Your executive summary will be generated here]

## Corporate Experience

### Relevant Projects
[Relevant project descriptions will be generated here]

### Technical Experience
[Technical experience details will be generated here]

### Team Experience
[Team experience and qualifications will be generated here]

## Past Performance References

[Past performance references will be generated here]

## Key Personnel

[Key personnel information will be generated here]

## Corporate Capabilities

[Corporate capabilities will be generated here]

---
*Generated by Valinor Studio - AI-Powered Government Proposal Assistant*`;
    }
    getPricingTemplate() {
        return `# Pricing Proposal

## Executive Summary

[Your executive summary will be generated here]

## Pricing Structure

### Labor Categories
[Labor categories and rates will be generated here]

### Materials and Equipment
[Materials and equipment costs will be generated here]

### Travel and Other Direct Costs
[Travel and other direct costs will be generated here]

## Cost Breakdown

[Detailed cost breakdown will be generated here]

## Pricing Assumptions

[Pricing assumptions will be generated here]

## Competitive Analysis

[Competitive analysis will be generated here]

## Value Proposition

[Value proposition will be generated here]

---
*Generated by Valinor Studio - AI-Powered Government Proposal Assistant*`;
    }
    getStandardTemplate() {
        return `# Government Proposal

## Executive Summary

[Your executive summary will be generated here]

## Background

[Background information will be generated here]

## Technical Approach

[Technical approach will be generated here]

## Requirements Analysis

[Requirements analysis will be generated here]

## Compliance Matrix

[Compliance matrix will be generated here]

## Pricing

[Pricing information will be generated here]

## Team & Experience

[Team and experience information will be generated here]

## Risk Management

[Risk management plan will be generated here]

## Quality Assurance

[Quality assurance plan will be generated here]

---
*Generated by Valinor Studio - AI-Powered Government Proposal Assistant*`;
    }
    dispose() {
        this._disposables.forEach(disposable => disposable.dispose());
        this._fileWatchers.forEach(watcher => watcher.dispose());
    }
}
exports.FileHandlers = FileHandlers;
//# sourceMappingURL=file-handlers.js.map