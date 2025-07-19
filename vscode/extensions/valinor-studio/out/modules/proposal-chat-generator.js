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
exports.ProposalChatGenerator = void 0;
const vscode = __importStar(require("vscode"));
const ai_analyzer_1 = require("./ai-analyzer");
class ProposalChatGenerator {
    constructor(chatProvider, output) {
        this.generatedSections = new Map();
        this.suggestionHistory = null;
        this.chatProvider = chatProvider;
        this.output = output;
    }
    setSuggestionHistory(history) {
        this.suggestionHistory = history;
    }
    // Register commands for proposal chat generation
    registerCommands(context) {
        const generateProposalSectionCommand = vscode.commands.registerCommand('valinorStudio.generateProposalSection', async (contractId, sectionType) => {
            await this.generateProposalSection(contractId, sectionType);
        });
        const approveSectionCommand = vscode.commands.registerCommand('valinorStudio.approveSection', async (sectionId) => {
            await this.approveSection(sectionId);
        });
        const rejectSectionCommand = vscode.commands.registerCommand('valinorStudio.rejectSection', async (sectionId) => {
            await this.rejectSection(sectionId);
        });
        const copySectionCommand = vscode.commands.registerCommand('valinorStudio.copySection', async (sectionId) => {
            await this.copySection(sectionId);
        });
        const regenerateSectionCommand = vscode.commands.registerCommand('valinorStudio.regenerateSection', async (sectionId) => {
            await this.regenerateSection(sectionId);
        });
        context.subscriptions.push(generateProposalSectionCommand, approveSectionCommand, rejectSectionCommand, copySectionCommand, regenerateSectionCommand);
    }
    // Main function to generate proposal section through chat
    async generateProposalSection(contractId, sectionType) {
        try {
            // Get business profile data
            const businessProfile = await this.getBusinessProfileData();
            if (!businessProfile) {
                vscode.window.showErrorMessage('No business profile found. Please complete your business profile first.');
                return;
            }
            // Get contract data
            const contractData = await this.getContractData(contractId);
            if (!contractData) {
                vscode.window.showErrorMessage('Contract data not found. Please import the contract first.');
                return;
            }
            // Create generation request
            const request = {
                contractId,
                businessProfile,
                sectionType: sectionType,
                customPrompt: undefined
            };
            // Generate the section through AI chat
            await this.generateSectionThroughChat(request);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to generate proposal section: ${errorMessage}`);
            this.output.appendLine(`❌ Error generating proposal section: ${errorMessage}`);
        }
    }
    // Generate section through interactive chat
    async generateSectionThroughChat(request) {
        try {
            // Create the initial prompt with business context
            const initialPrompt = this.createBusinessContextPrompt(request);
            // Add the initial message to chat
            this.chatProvider.addMessage('user', initialPrompt);
            // Create a unique section ID
            const sectionId = `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Show progress
            const progressOptions = {
                location: vscode.ProgressLocation.Notification,
                title: `Generating ${request.sectionType.replace('_', ' ')} section...`,
                cancellable: false
            };
            await vscode.window.withProgress(progressOptions, async (progress) => {
                progress.report({ increment: 0 });
                // Get the selected AI model
                const selectedModel = this.chatProvider['_selectedModel'] || 'GPT-4';
                // Generate content using AI
                const generatedContent = await this.generateAIContent(request, selectedModel);
                progress.report({ increment: 50 });
                // Create section object
                const section = {
                    id: sectionId,
                    title: this.getSectionTitle(request.sectionType),
                    content: generatedContent,
                    status: 'pending',
                    generatedAt: new Date(),
                    model: selectedModel
                };
                // Store the section
                this.generatedSections.set(sectionId, section);
                // Add the generated content to chat with action buttons
                this.addGeneratedSectionToChat(section);
                progress.report({ increment: 100 });
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to generate section: ${errorMessage}`);
            this.output.appendLine(`❌ Error generating section: ${errorMessage}`);
        }
    }
    // Create business context prompt
    createBusinessContextPrompt(request) {
        const sectionTitle = this.getSectionTitle(request.sectionType);
        return `I need to generate a ${sectionTitle} section for a government contract proposal.

**CONTRACT INFORMATION:**
- Contract ID: ${request.contractId}
- Title: ${request.businessProfile.contractTitle || 'Government Contract'}
- Agency: ${request.businessProfile.agency || 'Federal Agency'}

**OUR BUSINESS PROFILE:**
- Company: ${request.businessProfile.companyName}
- CAGE Code: ${request.businessProfile.cageCode || 'N/A'}
- Core Competencies: ${request.businessProfile.coreCompetencies?.join(', ') || 'N/A'}
- Past Performance: ${request.businessProfile.pastPerformance?.length || 0} achievements
- NAICS Codes: ${request.businessProfile.naicsCodes?.join(', ') || 'N/A'}
- Compliance: ${request.businessProfile.complianceStandards?.join(', ') || 'N/A'}

Please generate a comprehensive ${sectionTitle} section that:
1. Incorporates our business strengths and experience
2. Addresses the specific contract requirements
3. Uses professional government proposal language
4. Includes relevant certifications and compliance standards
5. Demonstrates our competitive advantages

Generate the content in markdown format with proper structure and formatting.`;
    }
    // Get section title from type
    getSectionTitle(sectionType) {
        const titles = {
            'executive_summary': 'Executive Summary',
            'technical_approach': 'Technical Approach',
            'management_plan': 'Management Plan',
            'past_performance': 'Past Performance',
            'cost_proposal': 'Cost Proposal',
            'risk_assessment': 'Risk Assessment',
            'custom': 'Custom Section'
        };
        return titles[sectionType] || 'Custom Section';
    }
    // Get business profile data
    async getBusinessProfileData() {
        // For now, return mock data. In real implementation, fetch from business profile API
        return {
            companyName: 'Valinor Solutions Inc.',
            cageCode: '7A8B9',
            coreCompetencies: [
                'Government Contract Management',
                'Technical Consulting Services',
                'Project Management & Implementation',
                'Cybersecurity Solutions',
                'Cloud Infrastructure Development'
            ],
            pastPerformance: [
                'Successfully delivered 15+ government contracts worth $50M+',
                'Maintained 98% client satisfaction rating across all projects',
                'Completed Department of Defense cybersecurity assessment'
            ],
            naicsCodes: [
                '541511 - Custom Computer Programming Services',
                '541512 - Computer Systems Design Services',
                '541519 - Other Computer Related Services'
            ],
            complianceStandards: [
                'ISO 27001:2013 Information Security Management',
                'ISO 9001:2015 Quality Management System',
                'FedRAMP Moderate Authorization'
            ],
            contractorHistory: [
                'GSA Schedule 70 - Information Technology',
                '8(a) Business Development Program',
                'Small Business Administration (SBA) Certified'
            ]
        };
    }
    // Get contract data
    async getContractData(contractId) {
        // For now, return mock data. In real implementation, fetch from contract database
        return {
            contractId,
            title: 'Information Technology Support Services',
            agency: 'Department of Defense',
            description: 'Comprehensive IT support and cybersecurity services',
            requirements: [
                'Cybersecurity assessment and implementation',
                'Cloud infrastructure management',
                'System administration and maintenance',
                'Technical consulting and support'
            ]
        };
    }
    // Generate AI content
    async generateAIContent(request, model) {
        // Create a mock output channel for the AI analyzer
        const output = {
            appendLine: (text) => {
                // Silent output for section generation
            }
        };
        // Create mock contract data for context
        const mockContractData = {
            title: request.businessProfile.contractTitle || 'Government Contract',
            noticeId: request.contractId,
            description: 'Section generation for proposal enhancement'
        };
        // Use the AI analyzer to generate content
        let generatedContent = '';
        // Override the addMessage method temporarily to capture the response
        const originalAddMessage = this.chatProvider.addMessage.bind(this.chatProvider);
        this.chatProvider.addMessage = (type, content, model) => {
            if (type === 'ai') {
                generatedContent = content;
            }
        };
        try {
            await (0, ai_analyzer_1.analyzeContractWithAI)(mockContractData, output, this.chatProvider, model);
        }
        finally {
            // Restore the original method
            this.chatProvider.addMessage = originalAddMessage;
        }
        return generatedContent || 'Content generation failed. Please try again.';
    }
    // Add generated section to chat with action buttons
    addGeneratedSectionToChat(section) {
        const actionButtons = this.generateActionButtonsHTML(section);
        const messageContent = `
## ${section.title}

${section.content}

---

**Generated by ${section.model} on ${section.generatedAt.toLocaleString()}**

${actionButtons}
		`;
        this.chatProvider.addMessage('ai', messageContent, section.model);
    }
    // Generate action buttons HTML
    generateActionButtonsHTML(section) {
        return `
<div class="proposal-actions" data-section-id="${section.id}">
	<button class="action-btn approve-btn" onclick="approveSection('${section.id}')" ${section.status === 'approved' ? 'disabled' : ''}>
		✅ ${section.status === 'approved' ? 'Approved' : 'Approve'}
	</button>
	<button class="action-btn reject-btn" onclick="rejectSection('${section.id}')" ${section.status === 'rejected' ? 'disabled' : ''}>
		❌ ${section.status === 'rejected' ? 'Rejected' : 'Reject'}
	</button>
	<button class="action-btn copy-btn" onclick="copySection('${section.id}')">
		📋 Copy to Clipboard
	</button>
	<button class="action-btn regenerate-btn" onclick="regenerateSection('${section.id}')">
		🔄 Regenerate
	</button>
</div>

<style>
.proposal-actions {
	margin-top: 15px;
	padding: 10px;
	background: #2d2d30;
	border-radius: 6px;
	border: 1px solid #3e3e42;
}

.action-btn {
	margin-right: 10px;
	padding: 6px 12px;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 12px;
	font-weight: 600;
	transition: all 0.2s ease;
}

.approve-btn {
	background: #28a745;
	color: white;
}

.approve-btn:hover:not(:disabled) {
	background: #218838;
}

.reject-btn {
	background: #dc3545;
	color: white;
}

.reject-btn:hover:not(:disabled) {
	background: #c82333;
}

.copy-btn {
	background: #007acc;
	color: white;
}

.copy-btn:hover {
	background: #005a9e;
}

.regenerate-btn {
	background: #6c757d;
	color: white;
}

.regenerate-btn:hover {
	background: #5a6268;
}

.action-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
</style>

<script>
function approveSection(sectionId) {
	vscode.postMessage({
		command: 'approveSection',
		sectionId: sectionId
	});
}

function rejectSection(sectionId) {
	vscode.postMessage({
		command: 'rejectSection',
		sectionId: sectionId
	});
}

function copySection(sectionId) {
	vscode.postMessage({
		command: 'copySection',
		sectionId: sectionId
	});
}

function regenerateSection(sectionId) {
	vscode.postMessage({
		command: 'regenerateSection',
		sectionId: sectionId
	});
}
</script>
		`;
    }
    // Approve section
    async approveSection(sectionId) {
        const section = this.generatedSections.get(sectionId);
        if (section) {
            section.status = 'approved';
            this.generatedSections.set(sectionId, section);
            // Add to suggestion history when approved
            if (this.suggestionHistory) {
                await this.suggestionHistory.addSuggestion({
                    section: section.title,
                    model: section.model,
                    originalContent: '',
                    suggestedContent: section.content,
                    filePath: 'proposal.md'
                });
            }
            vscode.window.showInformationMessage(`✅ Section "${section.title}" approved!`);
            this.output.appendLine(`✅ Section "${section.title}" approved`);
            // Update the chat message to reflect approval
            this.updateSectionStatusInChat(sectionId, 'approved');
        }
    }
    // Reject section
    async rejectSection(sectionId) {
        const section = this.generatedSections.get(sectionId);
        if (section) {
            section.status = 'rejected';
            this.generatedSections.set(sectionId, section);
            vscode.window.showInformationMessage(`❌ Section "${section.title}" rejected.`);
            this.output.appendLine(`❌ Section "${section.title}" rejected`);
            // Update the chat message to reflect rejection
            this.updateSectionStatusInChat(sectionId, 'rejected');
        }
    }
    // Copy section to clipboard
    async copySection(sectionId) {
        const section = this.generatedSections.get(sectionId);
        if (section) {
            await vscode.env.clipboard.writeText(section.content);
            vscode.window.showInformationMessage(`📋 Section "${section.title}" copied to clipboard!`);
            this.output.appendLine(`📋 Section "${section.title}" copied to clipboard`);
            section.status = 'copied';
            this.generatedSections.set(sectionId, section);
        }
    }
    // Regenerate section
    async regenerateSection(sectionId) {
        const section = this.generatedSections.get(sectionId);
        if (section) {
            // Create a new generation request
            const request = {
                contractId: 'regenerate',
                businessProfile: await this.getBusinessProfileData(),
                sectionType: this.getSectionTypeFromTitle(section.title),
                customPrompt: `Please regenerate the ${section.title} section with improvements and variations.`
            };
            // Generate new content
            await this.generateSectionThroughChat(request);
            vscode.window.showInformationMessage(`🔄 Regenerating section "${section.title}"...`);
            this.output.appendLine(`🔄 Regenerating section "${section.title}"`);
        }
    }
    // Get section type from title
    getSectionTypeFromTitle(title) {
        const titleMap = {
            'Executive Summary': 'executive_summary',
            'Technical Approach': 'technical_approach',
            'Management Plan': 'management_plan',
            'Past Performance': 'past_performance',
            'Cost Proposal': 'cost_proposal',
            'Risk Assessment': 'risk_assessment'
        };
        return titleMap[title] || 'custom';
    }
    // Update section status in chat
    updateSectionStatusInChat(sectionId, status) {
        // This would update the chat message to reflect the new status
        // Implementation depends on chat provider capabilities
        this.output.appendLine(`📝 Updated section ${sectionId} status to ${status}`);
    }
    // Get all generated sections
    getGeneratedSections() {
        return Array.from(this.generatedSections.values());
    }
    // Get approved sections
    getApprovedSections() {
        return Array.from(this.generatedSections.values()).filter(section => section.status === 'approved');
    }
    // Export approved sections to proposal
    async exportApprovedSections() {
        const approvedSections = this.getApprovedSections();
        let proposalContent = '# Government Contract Proposal\n\n';
        approvedSections.forEach(section => {
            proposalContent += `## ${section.title}\n\n${section.content}\n\n---\n\n`;
        });
        return proposalContent;
    }
}
exports.ProposalChatGenerator = ProposalChatGenerator;
//# sourceMappingURL=proposal-chat-generator.js.map