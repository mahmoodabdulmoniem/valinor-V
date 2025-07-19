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
exports.BusinessProfileEnrichment = void 0;
const vscode = __importStar(require("vscode"));
class BusinessProfileEnrichment {
    constructor(output) {
        this.output = output;
    }
    // Register commands for business profile enrichment
    registerCommands(context) {
        const insertCompanyProfileCommand = vscode.commands.registerCommand('valinorStudio.insertCompanyProfile', async () => {
            await this.insertCompanyProfile();
        });
        context.subscriptions.push(insertCompanyProfileCommand);
    }
    // Main function to insert company profile
    async insertCompanyProfile() {
        try {
            // Get the active text editor
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor found. Please open a proposal.md file.');
                return;
            }
            const document = editor.document;
            if (document.fileName !== 'proposal.md') {
                vscode.window.showErrorMessage('Please open a proposal.md file to insert company profile.');
                return;
            }
            // Show progress
            const progressOptions = {
                location: vscode.ProgressLocation.Notification,
                title: 'Loading business profile...',
                cancellable: false
            };
            await vscode.window.withProgress(progressOptions, async (progress) => {
                progress.report({ increment: 0 });
                // Get business profile data
                const profileData = await this.getBusinessProfileData();
                progress.report({ increment: 50 });
                if (!profileData) {
                    vscode.window.showErrorMessage('No business profile found. Please complete your business profile in Settings first.');
                    return;
                }
                // Show profile confirmation modal
                const confirmedData = await this.showProfileConfirmationModal(profileData);
                progress.report({ increment: 75 });
                if (confirmedData) {
                    // Generate and insert company profile section
                    await this.generateAndInsertCompanyProfile(editor, confirmedData);
                    progress.report({ increment: 100 });
                }
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to insert company profile: ${errorMessage}`);
            this.output.appendLine(`❌ Error inserting company profile: ${errorMessage}`);
        }
    }
    // Get business profile data from the system
    async getBusinessProfileData() {
        try {
            // For now, we'll use a mock profile. In a real implementation,
            // this would fetch from the business profile API
            const mockProfile = {
                companyName: 'Valinor Solutions Inc.',
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
                    'Completed Department of Defense cybersecurity assessment',
                    'Implemented enterprise-wide cloud migration for federal agency',
                    'Led cross-functional teams of 50+ professionals'
                ],
                differentiators: [
                    'ISO 27001 certified cybersecurity practices',
                    'Proprietary project management methodology',
                    '24/7 dedicated support team',
                    'Advanced analytics and reporting capabilities',
                    'Proven track record of on-time, under-budget delivery'
                ],
                naicsCodes: [
                    '541511 - Custom Computer Programming Services',
                    '541512 - Computer Systems Design Services',
                    '541519 - Other Computer Related Services',
                    '541611 - Administrative Management and General Management Consulting Services',
                    '541690 - Other Scientific and Technical Consulting Services'
                ],
                cageCode: '7A8B9',
                complianceStandards: [
                    'ISO 27001:2013 Information Security Management',
                    'ISO 9001:2015 Quality Management System',
                    'FedRAMP Moderate Authorization',
                    'DoD Cybersecurity Maturity Model Certification (CMMC) Level 3',
                    'SOC 2 Type II Compliance'
                ],
                contractorHistory: [
                    'GSA Schedule 70 - Information Technology',
                    'GSA Schedule 874 - Mission Oriented Business Integrated Services (MOBIS)',
                    '8(a) Business Development Program',
                    'Small Business Administration (SBA) Certified',
                    'Veteran-Owned Small Business (VOSB)'
                ]
            };
            return mockProfile;
        }
        catch (error) {
            this.output.appendLine(`❌ Error fetching business profile: ${error}`);
            return null;
        }
    }
    // Show confirmation modal for profile data
    async showProfileConfirmationModal(profileData) {
        return new Promise((resolve) => {
            // Create a custom webview panel for the modal
            const panel = vscode.window.createWebviewPanel('companyProfileConfirmation', 'Confirm Company Profile', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            // Generate HTML for the modal
            panel.webview.html = this.generateConfirmationModalHTML(profileData);
            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(message => {
                switch (message.command) {
                    case 'confirm':
                        panel.dispose();
                        resolve(message.data);
                        break;
                    case 'cancel':
                        panel.dispose();
                        resolve(null);
                        break;
                }
            });
        });
    }
    // Generate HTML for the confirmation modal
    generateConfirmationModalHTML(profileData) {
        return `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<style>
					body {
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
						padding: 20px;
						background: #1e1e1e;
						color: #cccccc;
						line-height: 1.6;
					}
					.container {
						max-width: 800px;
						margin: 0 auto;
					}
					.header {
						text-align: center;
						margin-bottom: 30px;
						padding-bottom: 20px;
						border-bottom: 1px solid #3e3e42;
					}
					.section {
						margin-bottom: 25px;
						padding: 15px;
						background: #2d2d30;
						border-radius: 6px;
						border: 1px solid #3e3e42;
					}
					.section h3 {
						margin: 0 0 10px 0;
						color: #007acc;
						font-size: 16px;
					}
					.field {
						margin-bottom: 15px;
					}
					.field label {
						display: block;
						margin-bottom: 5px;
						font-weight: 600;
						color: #cccccc;
					}
					.field input, .field textarea {
						width: 100%;
						padding: 8px 12px;
						border: 1px solid #3e3e42;
						border-radius: 4px;
						background: #1e1e1e;
						color: #cccccc;
						font-size: 14px;
					}
					.field textarea {
						min-height: 80px;
						resize: vertical;
					}
					.list-item {
						display: flex;
						align-items: center;
						margin-bottom: 8px;
						padding: 8px;
						background: #1e1e1e;
						border-radius: 4px;
						border: 1px solid #3e3e42;
					}
					.list-item input {
						flex: 1;
						margin-right: 10px;
						border: none;
						background: transparent;
						color: #cccccc;
					}
					.remove-btn {
						background: #d73a49;
						color: white;
						border: none;
						border-radius: 4px;
						padding: 4px 8px;
						cursor: pointer;
						font-size: 12px;
					}
					.add-btn {
						background: #28a745;
						color: white;
						border: none;
						border-radius: 4px;
						padding: 8px 16px;
						cursor: pointer;
						margin-top: 10px;
						font-size: 14px;
					}
					.buttons {
						text-align: center;
						margin-top: 30px;
						padding-top: 20px;
						border-top: 1px solid #3e3e42;
					}
					.btn {
						padding: 10px 20px;
						margin: 0 10px;
						border: none;
						border-radius: 4px;
						cursor: pointer;
						font-size: 14px;
						font-weight: 600;
					}
					.btn-primary {
						background: #007acc;
						color: white;
					}
					.btn-secondary {
						background: #6c757d;
						color: white;
					}
					.btn:hover {
						opacity: 0.9;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h2>Company Profile Confirmation</h2>
						<p>Review and edit your company profile before inserting into the proposal</p>
					</div>

					<div class="section">
						<h3>Company Information</h3>
						<div class="field">
							<label>Company Name</label>
							<input type="text" id="companyName" value="${profileData.companyName}">
						</div>
						<div class="field">
							<label>CAGE Code</label>
							<input type="text" id="cageCode" value="${profileData.cageCode || ''}" placeholder="Enter CAGE code">
						</div>
					</div>

					<div class="section">
						<h3>Core Competencies</h3>
						<div id="coreCompetencies">
							${profileData.coreCompetencies.map(item => `
								<div class="list-item">
									<input type="text" value="${item}">
									<button class="remove-btn" onclick="removeListItem(this)">Remove</button>
								</div>
							`).join('')}
						</div>
						<button class="add-btn" onclick="addListItem('coreCompetencies')">Add Competency</button>
					</div>

					<div class="section">
						<h3>Past Performance Highlights</h3>
						<div id="pastPerformance">
							${profileData.pastPerformance.map(item => `
								<div class="list-item">
									<input type="text" value="${item}">
									<button class="remove-btn" onclick="removeListItem(this)">Remove</button>
								</div>
							`).join('')}
						</div>
						<button class="add-btn" onclick="addListItem('pastPerformance')">Add Performance Item</button>
					</div>

					<div class="section">
						<h3>Key Differentiators</h3>
						<div id="differentiators">
							${profileData.differentiators.map(item => `
								<div class="list-item">
									<input type="text" value="${item}">
									<button class="remove-btn" onclick="removeListItem(this)">Remove</button>
								</div>
							`).join('')}
						</div>
						<button class="add-btn" onclick="addListItem('differentiators')">Add Differentiator</button>
					</div>

					<div class="section">
						<h3>NAICS Codes</h3>
						<div id="naicsCodes">
							${profileData.naicsCodes.map(item => `
								<div class="list-item">
									<input type="text" value="${item}">
									<button class="remove-btn" onclick="removeListItem(this)">Remove</button>
								</div>
							`).join('')}
						</div>
						<button class="add-btn" onclick="addListItem('naicsCodes')">Add NAICS Code</button>
					</div>

					<div class="section">
						<h3>Compliance Standards</h3>
						<div id="complianceStandards">
							${profileData.complianceStandards.map(item => `
								<div class="list-item">
									<input type="text" value="${item}">
									<button class="remove-btn" onclick="removeListItem(this)">Remove</button>
								</div>
							`).join('')}
						</div>
						<button class="add-btn" onclick="addListItem('complianceStandards')">Add Compliance Standard</button>
					</div>

					<div class="section">
						<h3>Contractor History & Certifications</h3>
						<div id="contractorHistory">
							${profileData.contractorHistory.map(item => `
								<div class="list-item">
									<input type="text" value="${item}">
									<button class="remove-btn" onclick="removeListItem(this)">Remove</button>
								</div>
							`).join('')}
						</div>
						<button class="add-btn" onclick="addListItem('contractorHistory')">Add Certification</button>
					</div>

					<div class="buttons">
						<button class="btn btn-primary" onclick="confirmProfile()">Insert Company Profile</button>
						<button class="btn btn-secondary" onclick="cancel()">Cancel</button>
					</div>
				</div>

				<script>
					function addListItem(containerId) {
						const container = document.getElementById(containerId);
						const newItem = document.createElement('div');
						newItem.className = 'list-item';
						newItem.innerHTML = \`
							<input type="text" value="">
							<button class="remove-btn" onclick="removeListItem(this)">Remove</button>
						\`;
						container.appendChild(newItem);
					}

					function removeListItem(button) {
						button.parentElement.remove();
					}

					function getListValues(containerId) {
						const container = document.getElementById(containerId);
						const inputs = container.querySelectorAll('input');
						return Array.from(inputs).map(input => input.value.trim()).filter(value => value !== '');
					}

					function confirmProfile() {
						const data = {
							companyName: document.getElementById('companyName').value,
							cageCode: document.getElementById('cageCode').value,
							coreCompetencies: getListValues('coreCompetencies'),
							pastPerformance: getListValues('pastPerformance'),
							differentiators: getListValues('differentiators'),
							naicsCodes: getListValues('naicsCodes'),
							complianceStandards: getListValues('complianceStandards'),
							contractorHistory: getListValues('contractorHistory')
						};

						vscode.postMessage({
							command: 'confirm',
							data: data
						});
					}

					function cancel() {
						vscode.postMessage({
							command: 'cancel'
						});
					}
				</script>
			</body>
			</html>
		`;
    }
    // Generate and insert the company profile section
    async generateAndInsertCompanyProfile(editor, profileData) {
        try {
            // Generate the company profile content
            const profileContent = this.generateCompanyProfileContent(profileData);
            // Find the best position to insert (after title, before first section)
            const insertPosition = this.findInsertPosition(editor.document);
            // Insert the content
            await editor.edit(editBuilder => {
                editBuilder.insert(insertPosition, profileContent);
            });
            // Show success message
            vscode.window.showInformationMessage('Company profile successfully inserted into proposal!');
            this.output.appendLine('✅ Company profile inserted successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            vscode.window.showErrorMessage(`Failed to insert company profile: ${errorMessage}`);
            this.output.appendLine(`❌ Error inserting company profile: ${errorMessage}`);
        }
    }
    // Find the best position to insert the company profile
    findInsertPosition(document) {
        const text = document.getText();
        const lines = text.split('\n');
        // Look for the title (first # header)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(/^#\s+/)) {
                // Find the end of the title section
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].match(/^#{1,6}\s+/) || lines[j].trim() === '') {
                        continue;
                    }
                    if (lines[j].trim() !== '') {
                        // Insert after the title and any blank lines
                        return new vscode.Position(j, 0);
                    }
                }
                // If no content after title, insert at the end
                return new vscode.Position(lines.length, 0);
            }
        }
        // If no title found, insert at the beginning
        return new vscode.Position(0, 0);
    }
    // Generate the company profile content
    generateCompanyProfileContent(profileData) {
        const cageCodeSection = profileData.cageCode ? `**CAGE Code:** ${profileData.cageCode}` : '';
        return `

## Company Profile

**${profileData.companyName}** is a leading provider of professional services with extensive experience in government contracting and technical solutions delivery. ${cageCodeSection}

### Core Competencies

${profileData.coreCompetencies.map(competency => `- **${competency}**`).join('\n')}

### Past Performance Highlights

${profileData.pastPerformance.map(performance => `- ${performance}`).join('\n')}

### Key Differentiators

${profileData.differentiators.map(differentiator => `- ${differentiator}`).join('\n')}

### NAICS Codes & Classifications

${profileData.naicsCodes.map(code => `- ${code}`).join('\n')}

### Compliance Standards & Certifications

${profileData.complianceStandards.map(standard => `- ${standard}`).join('\n')}

### Contractor History & Certifications

${profileData.contractorHistory.map(certification => `- ${certification}`).join('\n')}

---
`;
    }
}
exports.BusinessProfileEnrichment = BusinessProfileEnrichment;
//# sourceMappingURL=business-profile-enrichment.js.map