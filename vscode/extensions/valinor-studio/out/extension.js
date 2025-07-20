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
exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const chat_ui_1 = require("./modules/chat-ui");
const sam_api_1 = require("./modules/sam-api");
// Terminal output with V-pattern banner
function logToTerminal(message, type = 'info') {
    const banner = `
╔══════════════════════════════════════════════════════════════╗
║                    VALINOR STUDIO                            ║
║              Government Contract Analysis                    ║
╚══════════════════════════════════════════════════════════════╝
`;
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [VALINOR ${type.toUpperCase()}]`;
    // Show banner only for first message
    if (!logToTerminal.hasShownBanner) {
        console.log(banner);
        logToTerminal.hasShownBanner = true;
    }
    console.log(`${prefix} ${message}`);
}
// Add property to track banner display
logToTerminal.hasShownBanner = false;
const file_generator_1 = require("./modules/file-generator");
const ai_analyzer_1 = require("./modules/ai-analyzer");
const section_generator_1 = require("./modules/section-generator");
const business_profile_enrichment_1 = require("./modules/business-profile-enrichment");
const proposal_chat_generator_1 = require("./modules/proposal-chat-generator");
const suggestion_history_1 = require("./modules/suggestion-history");
const pricing_validation_1 = require("./modules/pricing-validation");
const pricing_api_1 = require("./modules/pricing-api");
const collaboration_1 = require("./modules/collaboration");
const comment_panel_1 = require("./modules/comment-panel");
const version_history_1 = require("./modules/version-history");
const version_panel_1 = require("./modules/version-panel");
const welcome_view_1 = require("./modules/welcome-view");
const contextual_ui_1 = require("./modules/contextual-ui");
const file_handlers_1 = require("./modules/file-handlers");
const terminal_tasks_1 = require("./modules/terminal-tasks");
const chat_sync_1 = require("./modules/chat-sync");
const pdf_extractor_1 = require("./modules/pdf-extractor");
const word_converter_1 = require("./modules/word-converter");
const compliance_checker_1 = require("./modules/compliance-checker");
const pricing_analyzer_1 = require("./modules/pricing-analyzer");
const extension_config_1 = require("./config/extension-config");
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
async function activate(context) {
    // Create output channel first so it's available in catch block
    const output = vscode.window.createOutputChannel('Valinor Studio');
    try {
        console.log('Valinor Studio is now active!');
        // Load environment variables from .env file first
        const envPath = path.join(__dirname, '..', '.env');
        console.log('[Valinor Studio] Loading .env from:', envPath);
        dotenv.config({ path: envPath });
        // Debug: Log environment variables after .env load
        console.log('[Valinor Studio] Environment variables after .env load:');
        console.log('SAM_API_KEY:', process.env.SAM_API_KEY ? 'SET' : 'NOT SET');
        console.log('OPENSEARCH_ENDPOINT:', process.env.OPENSEARCH_ENDPOINT ? 'SET' : 'NOT SET');
        console.log('OPENSEARCH_USERNAME:', process.env.OPENSEARCH_USERNAME ? 'SET' : 'NOT SET');
        console.log('OPENSEARCH_PASSWORD:', process.env.OPENSEARCH_PASSWORD ? 'SET' : 'NOT SET');
        // Set up environment variables from extension configuration (can override .env)
        (0, extension_config_1.setEnvironmentFromConfig)();
        // Check if configuration is complete and show guide if needed
        if (!(0, extension_config_1.isConfigurationComplete)()) {
            // Show configuration guide after a short delay to allow extension to fully load
            // Use a simple timeout to avoid circular reference issues
            const timeoutId = setTimeout(() => {
                try {
                    (0, extension_config_1.showConfigurationGuide)();
                }
                catch (error) {
                    console.error('Error showing configuration guide:', error);
                }
            }, 2000);
            // Clean up timeout on deactivation
            context.subscriptions.push({
                dispose: () => {
                    clearTimeout(timeoutId);
                }
            });
        }
        // Initialize welcome view provider
        const welcomeViewProvider = new welcome_view_1.WelcomeViewProvider(context.extensionUri);
        context.subscriptions.push(vscode.window.registerWebviewViewProvider(welcome_view_1.WelcomeViewProvider.viewType, welcomeViewProvider));
        // Initialize contextual UI
        const contextualUI = new contextual_ui_1.ContextualUI();
        context.subscriptions.push(contextualUI);
        // Initialize file handlers
        const fileHandlers = new file_handlers_1.FileHandlers();
        context.subscriptions.push(fileHandlers);
        // Initialize specialized modules
        const pdfExtractor = new pdf_extractor_1.PDFExtractor(output);
        const wordConverter = new word_converter_1.WordConverter(output);
        const complianceChecker = new compliance_checker_1.ComplianceChecker(output);
        const pricingAnalyzer = new pricing_analyzer_1.PricingAnalyzer(output);
        // Create chat provider
        const chatProvider = new chat_ui_1.ValinorChatViewProvider(context.extensionUri, output);
        // Initialize chat sync
        const chatSync = new chat_sync_1.ChatSync(chatProvider);
        context.subscriptions.push(chatSync);
        // Initialize terminal tasks
        const terminalTasks = new terminal_tasks_1.TerminalTasks();
        context.subscriptions.push(terminalTasks);
        // Register chat provider
        context.subscriptions.push(vscode.window.registerWebviewViewProvider(chat_ui_1.ValinorChatViewProvider.viewType, chatProvider));
        // Register chat-related commands
        const insertChatResponseCommand = vscode.commands.registerCommand('valinorStudio.insertChatResponse', (content, question) => {
            // This will be handled by the chat provider
            vscode.window.showInformationMessage('Insert functionality handled by chat provider');
        });
        const copyToClipboardCommand = vscode.commands.registerCommand('valinorStudio.copyToClipboard', (text) => {
            vscode.env.clipboard.writeText(text).then(() => {
                vscode.window.showInformationMessage('✅ Content copied to clipboard');
            });
        });
        // Create section generator
        const sectionGenerator = new section_generator_1.SectionGenerator(chatProvider);
        sectionGenerator.registerCommands(context);
        sectionGenerator.registerContextMenuProvider(context);
        // Create business profile enrichment
        const businessProfileEnrichment = new business_profile_enrichment_1.BusinessProfileEnrichment(output);
        businessProfileEnrichment.registerCommands(context);
        // Create proposal chat generator
        const proposalChatGenerator = new proposal_chat_generator_1.ProposalChatGenerator(chatProvider, output);
        proposalChatGenerator.registerCommands(context);
        // Register suggestion history
        const suggestionHistoryProvider = (0, suggestion_history_1.registerSuggestionHistory)(context);
        // Connect suggestion history to section generator
        sectionGenerator.setSuggestionHistory(suggestionHistoryProvider);
        // Connect suggestion history to proposal chat generator
        proposalChatGenerator.setSuggestionHistory(suggestionHistoryProvider);
        // Initialize pricing validation
        const pricingValidationProvider = new pricing_validation_1.PricingValidationProvider(output);
        pricingValidationProvider.registerCommands(context);
        // Start pricing API server
        const pricingAPIService = new pricing_api_1.PricingAPIService(output);
        // Start server with error handling to avoid circular references
        try {
            await pricingAPIService.startServer();
            output.appendLine('✅ Pricing validation API server started successfully');
        }
        catch (error) {
            output.appendLine(`❌ Failed to start pricing API server: ${error}`);
        }
        // Register cleanup on deactivation
        context.subscriptions.push({
            dispose: () => {
                try {
                    pricingAPIService.stopServer();
                }
                catch (error) {
                    console.error('Error stopping pricing API server:', error);
                }
            }
        });
        // Initialize collaboration manager
        const collaborationManager = new collaboration_1.CollaborationManager(output);
        // Register comment panel provider
        const commentPanelProvider = new comment_panel_1.CommentPanelProvider(context.extensionUri, collaborationManager);
        context.subscriptions.push(vscode.window.registerWebviewViewProvider(comment_panel_1.CommentPanelProvider.viewType, commentPanelProvider));
        // Initialize version history manager
        const versionHistoryManager = new version_history_1.VersionHistoryManager(output);
        // Register version panel provider
        const versionPanelProvider = new version_panel_1.VersionPanelProvider(context.extensionUri, versionHistoryManager);
        context.subscriptions.push(vscode.window.registerWebviewViewProvider(version_panel_1.VersionPanelProvider.viewType, versionPanelProvider));
        // Register collaboration commands
        const addCommentCommand = vscode.commands.registerCommand('valinorStudio.addComment', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }
            const content = await vscode.window.showInputBox({
                prompt: 'Enter your comment',
                placeHolder: 'Add a comment about this selection...'
            });
            if (content) {
                try {
                    await collaborationManager.addComment(editor, content);
                    commentPanelProvider.refreshComments();
                    vscode.window.showInformationMessage('💬 Comment added successfully');
                }
                catch (error) {
                    vscode.window.showErrorMessage(`❌ Error adding comment: ${error}`);
                }
            }
        });
        const showVersionHistoryCommand = vscode.commands.registerCommand('valinorStudio.showVersionHistory', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }
            try {
                await versionPanelProvider.refreshVersionHistory();
                vscode.commands.executeCommand('valinorStudio.versionPanel.focus');
            }
            catch (error) {
                vscode.window.showErrorMessage(`❌ Error loading version history: ${error}`);
            }
        });
        const initializeGitCommand = vscode.commands.registerCommand('valinorStudio.initializeGit', async () => {
            try {
                await versionHistoryManager.initializeGitRepository();
                vscode.window.showInformationMessage('✅ Git repository initialized successfully');
            }
            catch (error) {
                vscode.window.showErrorMessage(`❌ Error initializing Git repository: ${error}`);
            }
        });
        // Register configuration command
        const openConfigurationCommand = vscode.commands.registerCommand('valinorStudio.openConfiguration', async () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'valinorStudio');
        });
        // Register debug command to test environment variables
        const debugEnvCommand = vscode.commands.registerCommand('valinorStudio.debugEnv', async () => {
            console.log('[Valinor Studio] Environment Variables Debug:');
            console.log('SAM_API_KEY:', process.env.SAM_API_KEY ? 'SET' : 'NOT SET');
            console.log('OPENSEARCH_ENDPOINT:', process.env.OPENSEARCH_ENDPOINT ? 'SET' : 'NOT SET');
            console.log('OPENSEARCH_USERNAME:', process.env.OPENSEARCH_USERNAME ? 'SET' : 'NOT SET');
            console.log('OPENSEARCH_PASSWORD:', process.env.OPENSEARCH_PASSWORD ? 'SET' : 'NOT SET');
            console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
            vscode.window.showInformationMessage('Environment variables logged to console. Check Developer Tools.');
        });
        // Register command to help with SAM.gov API key setup
        const setupSamApiCommand = vscode.commands.registerCommand('valinorStudio.setupSamApi', async () => {
            const message = `🔑 SAM.gov API Key Setup Required

Your current SAM.gov API key is invalid. Here's how to get a valid one:

1. Go to https://sam.gov/api/
2. Sign in with your SAM.gov account (or create one)
3. Navigate to "API Access" section
4. Generate a new API key
5. Copy the API key and update your .env file

Current API Key Status: ${process.env.SAM_API_KEY ? 'SET (but invalid)' : 'NOT SET'}

Would you like to:
- Open SAM.gov API page
- Open your .env file for editing
- Test the current API key`;
            const action = await vscode.window.showInformationMessage(message, 'Open SAM.gov', 'Open .env File', 'Test API Key');
            if (action === 'Open SAM.gov') {
                vscode.env.openExternal(vscode.Uri.parse('https://sam.gov/api/'));
            }
            else if (action === 'Open .env File') {
                const envFile = vscode.Uri.file(path.join(__dirname, '..', '.env'));
                vscode.window.showTextDocument(envFile);
            }
            else if (action === 'Test API Key') {
                // Run the test command
                vscode.commands.executeCommand('valinorStudio.testContract');
            }
        });
        // Register test command to verify contract fetching
        const testContractCommand = vscode.commands.registerCommand('valinorStudio.testContract', async () => {
            try {
                const testNoticeId = '36C25525Q0477'; // The correct Notice ID from your example
                output.appendLine(`[TEST] Testing contract fetch with Notice ID: ${testNoticeId}`);
                const contractData = await (0, sam_api_1.searchSAMGovAPI)(testNoticeId, output);
                if (contractData) {
                    output.appendLine(`[SUCCESS] Test contract found!`);
                    output.appendLine(`[INFO] Title: ${contractData.title || 'N/A'}`);
                    output.appendLine(`[INFO] Agency: ${contractData.agency || contractData.fullParentPathName || 'N/A'}`);
                    vscode.window.showInformationMessage('Test successful! Contract found.');
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                output.appendLine(`[ERROR] Test failed: ${errorMessage}`);
                vscode.window.showErrorMessage(`Test failed: ${errorMessage}`);
            }
        });
        // Register new user experience commands
        const newProposalCommand = vscode.commands.registerCommand('valinorStudio.newProposal', async () => {
            await fileHandlers.createProposalFromTemplate('standard');
        });
        const quickPickCommand = vscode.commands.registerCommand('valinorStudio.quickPick', async () => {
            await contextualUI.showQuickPick();
        });
        const validatePricingTaskCommand = vscode.commands.registerCommand('valinorStudio.validatePricingTask', async () => {
            await terminalTasks.executeTask('Validate Pricing');
        });
        const checkComplianceTaskCommand = vscode.commands.registerCommand('valinorStudio.checkComplianceTask', async () => {
            await terminalTasks.executeTask('Check Compliance');
        });
        const generateProposalTaskCommand = vscode.commands.registerCommand('valinorStudio.generateProposalTask', async () => {
            await terminalTasks.executeTask('Generate Proposal');
        });
        const exportProposalTaskCommand = vscode.commands.registerCommand('valinorStudio.exportProposalTask', async () => {
            await terminalTasks.executeTask('Export Proposal');
        });
        const askAIAboutSectionCommand = vscode.commands.registerCommand('valinorStudio.askAIAboutSection', async (headingText) => {
            await chatSync.askAboutCurrentSection();
        });
        const askAIAboutSelectionCommand = vscode.commands.registerCommand('valinorStudio.askAIAboutSelection', async () => {
            await chatSync.askAboutSelectedText();
        });
        const suggestImprovementsCommand = vscode.commands.registerCommand('valinorStudio.suggestImprovements', async () => {
            await chatSync.suggestImprovements();
        });
        const checkComplianceCommand = vscode.commands.registerCommand('valinorStudio.checkCompliance', async () => {
            await chatSync.checkCompliance();
        });
        // Implement the missing logic for section validation
        const validateSectionCommand = vscode.commands.registerCommand('valinorStudio.validateSection', async (headingText) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }
            try {
                // Get the section content
                const sectionContent = chatSync.getCurrentContext();
                if (!sectionContent) {
                    vscode.window.showWarningMessage('No section content found. Please place your cursor within a section.');
                    return;
                }
                // Perform section validation
                const validationResult = await validateSectionContent(headingText, sectionContent);
                if (validationResult.isValid) {
                    vscode.window.showInformationMessage(`✅ Section "${headingText}" validation passed`);
                }
                else {
                    const issues = validationResult.issues.join(', ');
                    vscode.window.showWarningMessage(`⚠️ Section "${headingText}" has issues: ${issues}`);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`❌ Error validating section: ${error}`);
            }
        });
        // Implement the missing logic for pricing analysis
        const analyzePricingCommand = vscode.commands.registerCommand('valinorStudio.analyzePricing', async (prices) => {
            try {
                const analysis = await pricingAnalyzer.analyzePricing(prices);
                // Save analysis report
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (workspaceFolder) {
                    const reportPath = await pricingAnalyzer.savePricingAnalysis(analysis, workspaceFolder);
                    // Open the report
                    const document = await vscode.workspace.openTextDocument(reportPath);
                    await vscode.window.showTextDocument(document, { preview: false });
                    vscode.window.showInformationMessage(`📊 Pricing analysis completed. Score: ${analysis.summary.overallCompetitiveness}%`);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`❌ Error analyzing pricing: ${error}`);
            }
        });
        // Implement the missing logic for PDF extraction
        const extractRFPFromPDFCommand = vscode.commands.registerCommand('valinorStudio.extractRFPFromPDF', async (filePath) => {
            try {
                const rfpDocument = await pdfExtractor.extractRFPFromPDF(filePath);
                // Create analysis file
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (workspaceFolder) {
                    await pdfExtractor.createAnalysisFile(rfpDocument, workspaceFolder);
                    vscode.window.showInformationMessage(`📄 Successfully extracted RFP from PDF. Found ${rfpDocument.requirements.length} requirements.`);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`❌ Error extracting RFP from PDF: ${error}`);
            }
        });
        // Implement the missing logic for Word to Markdown conversion
        const convertWordToMarkdownCommand = vscode.commands.registerCommand('valinorStudio.convertWordToMarkdown', async (filePath) => {
            try {
                const convertedDocument = await wordConverter.convertWordToMarkdown(filePath);
                // Save converted document
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (workspaceFolder) {
                    const markdownPath = await wordConverter.saveConvertedDocument(convertedDocument, workspaceFolder);
                    // Open the converted document
                    await wordConverter.openConvertedDocument(markdownPath);
                    vscode.window.showInformationMessage(`📝 Successfully converted Word document to Markdown. ${convertedDocument.metadata.wordCount} words converted.`);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`❌ Error converting Word document: ${error}`);
            }
        });
        // Implement the missing logic for RFP text analysis
        const analyzeRFPTextCommand = vscode.commands.registerCommand('valinorStudio.analyzeRFPText', async (filePath) => {
            try {
                // Read the text file
                const content = fs.readFileSync(filePath, 'utf8');
                // Create a simulated RFP document for analysis
                const rfpDocument = await pdfExtractor.parseRFPDocument(content, filePath, fs.statSync(filePath).size);
                // Create analysis file
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (workspaceFolder) {
                    await pdfExtractor.createAnalysisFile(rfpDocument, workspaceFolder);
                    vscode.window.showInformationMessage(`📄 Successfully analyzed RFP text. Found ${rfpDocument.requirements.length} requirements.`);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`❌ Error analyzing RFP text: ${error}`);
            }
        });
        // Register commands
        const openChatCommand = vscode.commands.registerCommand('valinorStudio.openChat', () => {
            vscode.commands.executeCommand('valinor-chat.focus');
        });
        const importRFPCommand = vscode.commands.registerCommand('valinorStudio.importRFP', async () => {
            try {
                // Step 1: Get Notice ID from user
                const noticeId = await vscode.window.showInputBox({
                    prompt: 'Enter the Notice ID for the contract you want to analyze',
                    placeHolder: 'e.g., 12345678'
                });
                if (!noticeId) {
                    return;
                }
                logToTerminal(`🔍 Searching for contract with Notice ID: ${noticeId}`, 'info');
                logToTerminal(`Starting SAM.gov API search...`, 'debug');
                output.appendLine(`🔍 Searching for contract with Notice ID: ${noticeId}`);
                output.appendLine(`[VALINOR INFO] Starting SAM.gov API search...`);
                vscode.window.showInformationMessage(`🔍 Searching SAM.gov for contract: ${noticeId}...`);
                // Step 2: Fetch contract data from SAM.gov
                logToTerminal(`Calling searchSAMGovAPI function...`, 'debug');
                output.appendLine(`[VALINOR DEBUG] Calling searchSAMGovAPI function...`);
                const contractData = await (0, sam_api_1.searchSAMGovAPI)(noticeId, output);
                logToTerminal(`searchSAMGovAPI returned: ${contractData ? 'SUCCESS' : 'NULL'}`, 'debug');
                output.appendLine(`[VALINOR DEBUG] searchSAMGovAPI returned: ${contractData ? 'SUCCESS' : 'NULL'}`);
                // Step 3: Check if contract was found
                if (!contractData) {
                    logToTerminal(`No contract found for Notice ID: ${noticeId}`, 'error');
                    logToTerminal(`This may be due to:`, 'warning');
                    logToTerminal(`  - Contract not being in the API yet`, 'warning');
                    logToTerminal(`  - Date range limitations`, 'warning');
                    logToTerminal(`  - API availability issues`, 'warning');
                    logToTerminal(`  - Search parameter issues`, 'warning');
                    logToTerminal(`Try searching with a different Notice ID or check the SAM.gov website`, 'info');
                    output.appendLine(`❌ No contract found for Notice ID: ${noticeId}`);
                    vscode.window.showErrorMessage(`❌ No contract found for Notice ID: ${noticeId}. Please check the ID and try again.`);
                    return;
                }
                // Step 4: Create files in workspace
                logToTerminal(`✅ Contract found successfully!`, 'success');
                logToTerminal(`Title: ${contractData.title || 'N/A'}`, 'info');
                logToTerminal(`Agency: ${contractData.fullParentPathName || 'N/A'}`, 'info');
                logToTerminal(`Posted: ${contractData.postedDate || 'N/A'}`, 'info');
                logToTerminal(`Deadline: ${contractData.responseDeadLine || 'N/A'}`, 'info');
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (workspaceFolder) {
                    logToTerminal(`Creating contract files in workspace...`, 'info');
                    await (0, file_generator_1.createContractFiles)(contractData, workspaceFolder, output);
                }
                // Step 5: Send to AI for analysis
                logToTerminal(`🤖 Sending contract data to AI for analysis...`, 'info');
                output.appendLine(`🤖 Sending contract data to AI for analysis...`);
                vscode.window.showInformationMessage(`✅ Contract found! Creating analysis files...`);
                await (0, ai_analyzer_1.analyzeContractWithAI)(contractData, output, chatProvider, chatProvider['_selectedModel']);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
                output.appendLine(`❌ Error during RFP import: ${errorMessage}`);
                vscode.window.showErrorMessage(`Failed to import RFP: ${errorMessage}`);
            }
        });
        const selectModelCommand = vscode.commands.registerCommand('valinorStudio.selectModel', async () => {
            const models = ['GPT-4', 'GPT-3.5', 'Claude-3', 'Claude-2', 'Gemini-Pro'];
            const selected = await vscode.window.showQuickPick(models, {
                placeHolder: 'Select AI Model',
                canPickMany: false
            });
            if (selected) {
                chatProvider['_selectedModel'] = selected;
                // Update status bar
                modelStatusBarItem.text = `$(lightbulb) ${selected}`;
                // Store the selected model name
                context.workspaceState.update('selectedModel', selected);
            }
        });
        // Override the chat provider's message handling to integrate with contract analysis
        const originalHandleUserMessage = chatProvider['handleUserMessage'];
        chatProvider['handleUserMessage'] = async (text) => {
            // Add user message to chat
            chatProvider.addMessage('user', text);
            // Check if the message contains a Notice ID pattern
            const noticeIdMatch = text.match(/\b[A-Za-z0-9]{8,}\b/);
            if (noticeIdMatch) {
                const potentialNoticeId = noticeIdMatch[0];
                chatProvider.addMessage('ai', `🔍 I found a potential Notice ID: ${potentialNoticeId}. Let me search for this contract...`);
                try {
                    logToTerminal(`🔍 Chat detected Notice ID: ${potentialNoticeId}`, 'info');
                    const contractData = await (0, sam_api_1.searchSAMGovAPI)(potentialNoticeId, output);
                    // Check if contract was found
                    if (!contractData) {
                        logToTerminal(`No contract found for Notice ID: ${potentialNoticeId}`, 'error');
                        chatProvider.addMessage('ai', `❌ Sorry, I couldn't find a contract with Notice ID: ${potentialNoticeId}. Please check the ID and try again.`);
                        output.appendLine(`❌ No contract found for Notice ID: ${potentialNoticeId}`);
                        return;
                    }
                    // Create files in workspace
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    if (workspaceFolder) {
                        await (0, file_generator_1.createContractFiles)(contractData, workspaceFolder, output);
                    }
                    // Send to AI for analysis with the selected model
                    await (0, ai_analyzer_1.analyzeContractWithAI)(contractData, output, chatProvider, chatProvider['_selectedModel']);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                    chatProvider.addMessage('ai', `❌ Sorry, I couldn't find a contract with Notice ID: ${potentialNoticeId}. Please check the ID and try again.`);
                    output.appendLine(`❌ Failed to fetch contract: ${errorMessage}`);
                }
            }
            else if (text.toLowerCase().includes('import') || text.toLowerCase().includes('rfp')) {
                chatProvider.addMessage('ai', 'To import an RFP, use the "Import RFP" command from the command palette (Ctrl+Shift+P) or click the Import RFP button in the editor toolbar.');
            }
            else if (text.toLowerCase().includes('help') || text.toLowerCase().includes('what can you do')) {
                chatProvider.addMessage('ai', `I can help you with government contract analysis! Here's what I can do:

🔍 **Search Contracts**: Just paste a Notice ID and I'll find the contract
📊 **Analyze Requirements**: I'll break down technical requirements and compliance needs
📋 **Generate Files**: I create detailed analysis files for each contract
💡 **Provide Insights**: Get AI-powered recommendations and action items
📝 **Generate Sections**: Right-click on section headers in proposal.md to generate content
🏢 **Insert Company Profile**: Use "Proposal → Insert Company Profile" to add your business profile
💬 **Interactive Proposal Generation**: Use "Proposal → Generate Proposal Section via Chat" for AI-powered proposal creation with approve/reject/copy functionality

Try pasting a Notice ID or use the "Import RFP" command to get started!`);
            }
            else {
                // Default response for other messages
                chatProvider.addMessage('ai', 'I\'m here to help with government contract analysis! You can paste a Notice ID to search for contracts, or use the "Import RFP" command for more options.');
            }
        };
        // Add commands to subscriptions
        context.subscriptions.push(openChatCommand, importRFPCommand, selectModelCommand, insertChatResponseCommand, copyToClipboardCommand, addCommentCommand, showVersionHistoryCommand, initializeGitCommand, openConfigurationCommand, debugEnvCommand, testContractCommand, setupSamApiCommand, newProposalCommand, quickPickCommand, validatePricingTaskCommand, checkComplianceTaskCommand, generateProposalTaskCommand, exportProposalTaskCommand, askAIAboutSectionCommand, askAIAboutSelectionCommand, suggestImprovementsCommand, checkComplianceCommand, validateSectionCommand, analyzePricingCommand, extractRFPFromPDFCommand, convertWordToMarkdownCommand, analyzeRFPTextCommand);
        // Create status bar item for model selection
        const modelStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        modelStatusBarItem.text = '$(lightbulb) GPT-4';
        modelStatusBarItem.command = 'valinorStudio.selectModel';
        modelStatusBarItem.show();
        context.subscriptions.push(modelStatusBarItem);
        // Store only the model name, not the entire StatusBarItem object
        context.workspaceState.update('selectedModel', 'GPT-4');
        output.appendLine('✅ Valinor Studio extension activated successfully!');
    }
    catch (error) {
        console.error('Error activating Valinor Studio extension:', error);
        output.appendLine(`❌ Error activating extension: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
exports.activate = activate;
// Helper function for section validation
async function validateSectionContent(headingText, content) {
    const issues = [];
    // Check for minimum content length
    if (content.length < 50) {
        issues.push('Section content is too brief');
    }
    // Check for required elements based on section type
    const lowerHeading = headingText.toLowerCase();
    if (lowerHeading.includes('technical') || lowerHeading.includes('approach')) {
        if (!content.toLowerCase().includes('methodology') && !content.toLowerCase().includes('approach')) {
            issues.push('Technical approach section should include methodology or approach details');
        }
    }
    if (lowerHeading.includes('pricing') || lowerHeading.includes('cost')) {
        if (!content.match(/\$\d+/)) {
            issues.push('Pricing section should include cost information');
        }
    }
    if (lowerHeading.includes('experience') || lowerHeading.includes('performance')) {
        if (!content.toLowerCase().includes('experience') && !content.toLowerCase().includes('past')) {
            issues.push('Experience section should include past performance details');
        }
    }
    return {
        isValid: issues.length === 0,
        issues
    };
}
//# sourceMappingURL=extension.js.map