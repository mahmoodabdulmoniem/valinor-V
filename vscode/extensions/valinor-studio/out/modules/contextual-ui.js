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
exports.ContextualUI = void 0;
const vscode = __importStar(require("vscode"));
class ContextualUI {
    constructor() {
        this._statusBarItems = [];
        this._disposables = [];
        this.initializeCodeLens();
        this.initializeStatusBar();
        this.initializeContextualMenus();
        this.initializeHoverProviders();
    }
    initializeCodeLens() {
        // CodeLens provider for markdown headings
        this._codeLensProvider = {
            provideCodeLenses: (document, token) => {
                if (document.languageId !== 'markdown') {
                    return [];
                }
                const codeLenses = [];
                const text = document.getText();
                const lines = text.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const headingMatch = line.match(/^(#{2,})\s+(.+)$/);
                    if (headingMatch) {
                        const range = new vscode.Range(i, 0, i, line.length);
                        const headingText = headingMatch[2].trim();
                        // Generate Section CodeLens
                        codeLenses.push(new vscode.CodeLens(range, {
                            title: '⚡ Generate Section',
                            command: 'valinorStudio.generateSection',
                            arguments: [headingText]
                        }));
                        // Ask AI CodeLens
                        codeLenses.push(new vscode.CodeLens(range, {
                            title: '🤖 Ask AI',
                            command: 'valinorStudio.askAIAboutSection',
                            arguments: [headingText]
                        }));
                        // Validate Section CodeLens
                        codeLenses.push(new vscode.CodeLens(range, {
                            title: '✅ Validate',
                            command: 'valinorStudio.validateSection',
                            arguments: [headingText]
                        }));
                    }
                }
                return codeLenses;
            },
            resolveCodeLens: (codeLens, token) => {
                return codeLens;
            }
        };
        this._disposables.push(vscode.languages.registerCodeLensProvider({ language: 'markdown' }, this._codeLensProvider));
        // CodeLens provider for pricing lines
        const pricingCodeLensProvider = {
            provideCodeLenses: (document, token) => {
                const codeLenses = [];
                const text = document.getText();
                const lines = text.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    // Match various price patterns
                    const priceMatches = line.match(/\$[\d,]+(?:\.\d{2})?/g);
                    if (priceMatches) {
                        const range = new vscode.Range(i, 0, i, line.length);
                        codeLenses.push(new vscode.CodeLens(range, {
                            title: '💲 Validate Price',
                            command: 'valinorStudio.validatePricingAtPosition',
                            arguments: [i, line]
                        }));
                        codeLenses.push(new vscode.CodeLens(range, {
                            title: '📊 Market Analysis',
                            command: 'valinorStudio.analyzePricing',
                            arguments: [priceMatches]
                        }));
                    }
                }
                return codeLenses;
            },
            resolveCodeLens: (codeLens, token) => {
                return codeLens;
            }
        };
        this._disposables.push(vscode.languages.registerCodeLensProvider({ language: 'markdown' }, pricingCodeLensProvider));
    }
    initializeStatusBar() {
        // Main status bar items
        const importRFPItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        importRFPItem.text = '📥 Import RFP';
        importRFPItem.command = 'valinorStudio.importRFP';
        importRFPItem.tooltip = 'Import RFP from SAM.gov';
        importRFPItem.show();
        this._statusBarItems.push(importRFPItem);
        const chatItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
        chatItem.text = '💬 Chat';
        chatItem.command = 'valinorStudio.openChat';
        chatItem.tooltip = 'Open AI Chat Assistant';
        chatItem.show();
        this._statusBarItems.push(chatItem);
        const generateItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
        generateItem.text = '⚡ Generate';
        generateItem.command = 'valinorStudio.generateSection';
        generateItem.tooltip = 'Generate Section Content';
        generateItem.show();
        this._statusBarItems.push(generateItem);
        // Right side status bar items
        const pricingItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        pricingItem.text = '💲 Validate Pricing';
        pricingItem.command = 'valinorStudio.validateAllPricing';
        pricingItem.tooltip = 'Validate all pricing in document';
        pricingItem.show();
        this._statusBarItems.push(pricingItem);
        const complianceItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        complianceItem.text = '✅ Check Compliance';
        complianceItem.command = 'valinorStudio.checkCompliance';
        complianceItem.tooltip = 'Check proposal compliance';
        complianceItem.show();
        this._statusBarItems.push(complianceItem);
        const versionItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
        versionItem.text = '📜 Version History';
        versionItem.command = 'valinorStudio.showVersionHistory';
        versionItem.tooltip = 'Show version history';
        versionItem.show();
        this._statusBarItems.push(versionItem);
        // Update status bar based on active editor
        this.updateStatusBarForEditor();
        vscode.window.onDidChangeActiveTextEditor(() => {
            this.updateStatusBarForEditor();
        });
    }
    updateStatusBarForEditor() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this._statusBarItems.forEach(item => item.hide());
            return;
        }
        const isMarkdown = editor.document.languageId === 'markdown';
        const isProposal = editor.document.fileName.includes('proposal.md');
        // Show/hide items based on context
        this._statusBarItems[0].show(); // Import RFP - always visible
        this._statusBarItems[1].show(); // Chat - always visible
        if (isMarkdown && isProposal) {
            this._statusBarItems[2].show(); // Generate
            this._statusBarItems[3].show(); // Pricing
            this._statusBarItems[4].show(); // Compliance
            this._statusBarItems[5].show(); // Version
        }
        else {
            this._statusBarItems[2].hide(); // Generate
            this._statusBarItems[3].hide(); // Pricing
            this._statusBarItems[4].hide(); // Compliance
            this._statusBarItems[5].hide(); // Version
        }
    }
    initializeContextualMenus() {
        // Register contextual menu providers
        this._disposables.push(vscode.languages.registerHoverProvider({ language: 'markdown' }, {
            provideHover: (document, position, token) => {
                const line = document.lineAt(position.line).text;
                // Price hover
                const priceMatch = line.match(/\$[\d,]+(?:\.\d{2})?/);
                if (priceMatch) {
                    const contents = new vscode.MarkdownString();
                    contents.appendMarkdown('**💲 Price Detected**\n\n');
                    contents.appendMarkdown('Click to validate against market rates\n\n');
                    contents.appendMarkdown('$(lightbulb) Right-click for more options');
                    contents.isTrusted = true;
                    return new vscode.Hover(contents);
                }
                // Heading hover
                const headingMatch = line.match(/^(#{2,})\s+(.+)$/);
                if (headingMatch) {
                    const contents = new vscode.MarkdownString();
                    contents.appendMarkdown('**📋 Section Heading**\n\n');
                    contents.appendMarkdown('$(lightbulb) Right-click to generate content\n\n');
                    contents.appendMarkdown('$(question) Use CodeLens above for quick actions');
                    contents.isTrusted = true;
                    return new vscode.Hover(contents);
                }
                return null;
            }
        }));
    }
    initializeHoverProviders() {
        // Register hover providers for different content types
        this._disposables.push(vscode.languages.registerHoverProvider({ language: 'markdown' }, {
            provideHover: (document, position, token) => {
                const range = document.getWordRangeAtPosition(position);
                if (!range)
                    return null;
                const word = document.getText(range);
                // Company name hover
                if (this.isCompanyName(word)) {
                    const contents = new vscode.MarkdownString();
                    contents.appendMarkdown('**🏢 Company Profile**\n\n');
                    contents.appendMarkdown('$(lightbulb) Right-click to insert company profile\n\n');
                    contents.appendMarkdown('$(search) Use chat to get company information');
                    contents.isTrusted = true;
                    return new vscode.Hover(contents);
                }
                // Technical term hover
                if (this.isTechnicalTerm(word)) {
                    const contents = new vscode.MarkdownString();
                    contents.appendMarkdown(`**🔧 Technical Term: ${word}**\n\n`);
                    contents.appendMarkdown('$(lightbulb) Right-click to get technical explanation\n\n');
                    contents.appendMarkdown('$(question) Use chat for detailed analysis');
                    contents.isTrusted = true;
                    return new vscode.Hover(contents);
                }
                return null;
            }
        }));
    }
    isCompanyName(word) {
        // Simple heuristic for company names
        const companyPatterns = [
            /^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/,
            /^[A-Z]{2,}$/,
            /^[A-Z][a-z]+(?:\.|,|&|and|&amp;)\s*[A-Z][a-z]+/
        ];
        return companyPatterns.some(pattern => pattern.test(word));
    }
    isTechnicalTerm(word) {
        // Technical terms commonly found in proposals
        const technicalTerms = [
            'API', 'SDK', 'REST', 'SOAP', 'JSON', 'XML', 'SQL', 'NoSQL',
            'Cloud', 'AWS', 'Azure', 'GCP', 'DevOps', 'CI/CD', 'Kubernetes',
            'Docker', 'Microservices', 'API Gateway', 'Load Balancer',
            'Database', 'Server', 'Client', 'Frontend', 'Backend', 'Full-stack',
            'Machine Learning', 'AI', 'ML', 'Data Science', 'Analytics',
            'Security', 'Authentication', 'Authorization', 'Encryption',
            'Compliance', 'GDPR', 'HIPAA', 'SOC2', 'ISO27001'
        ];
        return technicalTerms.includes(word.toUpperCase());
    }
    // Quick pick palette
    async showQuickPick() {
        const items = [
            {
                label: '📥 Import RFP',
                description: 'Import contract from SAM.gov',
                command: 'valinorStudio.importRFP'
            },
            {
                label: '⚡ Generate Section',
                description: 'Generate content for current section',
                command: 'valinorStudio.generateSection'
            },
            {
                label: '💬 Open Chat',
                description: 'Open AI chat assistant',
                command: 'valinorStudio.openChat'
            },
            {
                label: '💲 Validate Pricing',
                description: 'Check pricing against market rates',
                command: 'valinorStudio.validateAllPricing'
            },
            {
                label: '✅ Check Compliance',
                description: 'Verify proposal compliance',
                command: 'valinorStudio.checkCompliance'
            },
            {
                label: '📜 Version History',
                description: 'View document version history',
                command: 'valinorStudio.showVersionHistory'
            },
            {
                label: '🏢 Insert Company Profile',
                description: 'Add company information',
                command: 'valinorStudio.insertCompanyProfile'
            },
            {
                label: '📊 Generate Compliance Matrix',
                description: 'Create compliance tracking matrix',
                command: 'valinorStudio.generateComplianceMatrix'
            }
        ];
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Choose a Valinor Studio action...',
            matchOnDescription: true
        });
        if (selected) {
            await vscode.commands.executeCommand(selected.command);
        }
    }
    // Update status bar text based on context
    updateStatusBarText(context, value) {
        switch (context) {
            case 'model':
                // Update model status bar item
                break;
            case 'pricing':
                this._statusBarItems[3].text = `💲 ${value}`;
                break;
            case 'compliance':
                this._statusBarItems[4].text = `✅ ${value}`;
                break;
        }
    }
    // Show contextual notification
    showContextualNotification(message, type = 'info') {
        const icon = type === 'info' ? 'ℹ️' : type === 'warning' ? '⚠️' : '❌';
        vscode.window.showInformationMessage(`${icon} ${message}`);
    }
    // Dispose all resources
    dispose() {
        this._statusBarItems.forEach(item => item.dispose());
        this._disposables.forEach(disposable => disposable.dispose());
    }
}
exports.ContextualUI = ContextualUI;
//# sourceMappingURL=contextual-ui.js.map