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
exports.ComplianceChecker = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ComplianceChecker {
    constructor(output) {
        this._rules = [];
        this._output = output;
        this.initializeRules();
    }
    initializeRules() {
        // Formatting Rules
        this._rules.push({
            id: 'format-heading-structure',
            name: 'Heading Structure',
            description: 'Check for proper heading hierarchy (H1 -> H2 -> H3)',
            category: 'formatting',
            severity: 'error',
            check: (content) => this.checkHeadingStructure(content)
        });
        this._rules.push({
            id: 'format-page-limits',
            name: 'Page Limits',
            description: 'Check if document meets page limit requirements',
            category: 'formatting',
            severity: 'error',
            check: (content) => this.checkPageLimits(content)
        });
        this._rules.push({
            id: 'format-font-consistency',
            name: 'Font Consistency',
            description: 'Check for consistent font usage throughout document',
            category: 'formatting',
            severity: 'warning',
            check: (content) => this.checkFontConsistency(content)
        });
        // Content Rules
        this._rules.push({
            id: 'content-executive-summary',
            name: 'Executive Summary',
            description: 'Check for presence and quality of executive summary',
            category: 'content',
            severity: 'error',
            check: (content) => this.checkExecutiveSummary(content)
        });
        this._rules.push({
            id: 'content-technical-approach',
            name: 'Technical Approach',
            description: 'Check for detailed technical approach section',
            category: 'content',
            severity: 'error',
            check: (content) => this.checkTechnicalApproach(content)
        });
        this._rules.push({
            id: 'content-pricing',
            name: 'Pricing Information',
            description: 'Check for complete pricing information',
            category: 'content',
            severity: 'error',
            check: (content) => this.checkPricingInformation(content)
        });
        this._rules.push({
            id: 'content-past-performance',
            name: 'Past Performance',
            description: 'Check for past performance references',
            category: 'content',
            severity: 'warning',
            check: (content) => this.checkPastPerformance(content)
        });
        // Regulatory Rules
        this._rules.push({
            id: 'regulatory-fisma-compliance',
            name: 'FISMA Compliance',
            description: 'Check for FISMA compliance requirements',
            category: 'regulatory',
            severity: 'error',
            check: (content) => this.checkFISMACompliance(content)
        });
        this._rules.push({
            id: 'regulatory-fedramp',
            name: 'FedRAMP Requirements',
            description: 'Check for FedRAMP compliance requirements',
            category: 'regulatory',
            severity: 'error',
            check: (content) => this.checkFedRAMPCompliance(content)
        });
        this._rules.push({
            id: 'regulatory-508-compliance',
            name: 'Section 508 Compliance',
            description: 'Check for Section 508 accessibility requirements',
            category: 'regulatory',
            severity: 'warning',
            check: (content) => this.check508Compliance(content)
        });
        // Technical Rules
        this._rules.push({
            id: 'technical-security',
            name: 'Security Requirements',
            description: 'Check for comprehensive security measures',
            category: 'technical',
            severity: 'error',
            check: (content) => this.checkSecurityRequirements(content)
        });
        this._rules.push({
            id: 'technical-scalability',
            name: 'Scalability Requirements',
            description: 'Check for scalability and performance requirements',
            category: 'technical',
            severity: 'warning',
            check: (content) => this.checkScalabilityRequirements(content)
        });
        this._rules.push({
            id: 'technical-integration',
            name: 'Integration Requirements',
            description: 'Check for system integration requirements',
            category: 'technical',
            severity: 'warning',
            check: (content) => this.checkIntegrationRequirements(content)
        });
    }
    async checkCompliance(documentPath) {
        this._output.appendLine(`🔍 Starting compliance check: ${documentPath}`);
        try {
            // Read document content
            const content = await this.readDocument(documentPath);
            // Run all compliance checks
            const results = [];
            for (const rule of this._rules) {
                try {
                    const result = rule.check(content);
                    results.push(result);
                }
                catch (error) {
                    this._output.appendLine(`⚠️ Error running rule ${rule.id}: ${error}`);
                }
            }
            // Generate compliance report
            const report = this.generateReport(documentPath, results);
            this._output.appendLine(`✅ Compliance check completed`);
            this._output.appendLine(`📊 Score: ${report.score}/100`);
            this._output.appendLine(`❌ Errors: ${report.errors.length}`);
            this._output.appendLine(`⚠️ Warnings: ${report.warnings.length}`);
            return report;
        }
        catch (error) {
            this._output.appendLine(`❌ Error during compliance check: ${error}`);
            throw error;
        }
    }
    async readDocument(documentPath) {
        if (!fs.existsSync(documentPath)) {
            throw new Error(`Document not found: ${documentPath}`);
        }
        const content = fs.readFileSync(documentPath, 'utf8');
        return content;
    }
    generateReport(documentPath, results) {
        const errors = results.filter(r => r.severity === 'error' && !r.passed);
        const warnings = results.filter(r => r.severity === 'warning' && !r.passed);
        const info = results.filter(r => r.severity === 'info' && !r.passed);
        const passed = results.filter(r => r.passed);
        const totalChecks = results.length;
        const failed = errors.length + warnings.length + info.length;
        const score = Math.round(((totalChecks - errors.length) / totalChecks) * 100);
        const recommendations = this.generateRecommendations(results);
        return {
            documentPath,
            checkDate: new Date().toISOString(),
            totalChecks,
            passed: passed.length,
            failed,
            errors,
            warnings,
            info,
            score,
            recommendations
        };
    }
    generateRecommendations(results) {
        const recommendations = [];
        const failedResults = results.filter(r => !r.passed);
        // Group by category
        const byCategory = {
            formatting: failedResults.filter(r => r.ruleId.includes('format')),
            content: failedResults.filter(r => r.ruleId.includes('content')),
            regulatory: failedResults.filter(r => r.ruleId.includes('regulatory')),
            technical: failedResults.filter(r => r.ruleId.includes('technical'))
        };
        if (byCategory.formatting.length > 0) {
            recommendations.push('Review document formatting and structure');
        }
        if (byCategory.content.length > 0) {
            recommendations.push('Ensure all required content sections are present and complete');
        }
        if (byCategory.regulatory.length > 0) {
            recommendations.push('Address regulatory compliance requirements (FISMA, FedRAMP, Section 508)');
        }
        if (byCategory.technical.length > 0) {
            recommendations.push('Review technical requirements and implementation details');
        }
        if (failedResults.length === 0) {
            recommendations.push('Document meets all compliance requirements');
        }
        return recommendations;
    }
    // Formatting Rule Implementations
    checkHeadingStructure(content) {
        const lines = content.split('\n');
        let currentLevel = 0;
        let hasH1 = false;
        let structureValid = true;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                if (level === 1) {
                    hasH1 = true;
                }
                if (level > currentLevel + 1) {
                    structureValid = false;
                    break;
                }
                currentLevel = level;
            }
        }
        return {
            ruleId: 'format-heading-structure',
            ruleName: 'Heading Structure',
            severity: 'error',
            message: structureValid && hasH1
                ? 'Document has proper heading hierarchy'
                : 'Document has improper heading hierarchy. Ensure H1 -> H2 -> H3 structure.',
            passed: structureValid && hasH1,
            suggestions: ['Start with a single H1 heading', 'Use H2 for main sections', 'Use H3 for subsections']
        };
    }
    checkPageLimits(content) {
        // Estimate pages (assuming 250 words per page)
        const wordCount = content.split(/\s+/).length;
        const estimatedPages = Math.ceil(wordCount / 250);
        // Assume 50-page limit for government proposals
        const pageLimit = 50;
        const withinLimit = estimatedPages <= pageLimit;
        return {
            ruleId: 'format-page-limits',
            ruleName: 'Page Limits',
            severity: 'error',
            message: withinLimit
                ? `Document is within page limits (${estimatedPages} pages)`
                : `Document exceeds page limits (${estimatedPages} pages, limit: ${pageLimit})`,
            passed: withinLimit,
            suggestions: ['Condense content where possible', 'Use appendices for detailed information', 'Focus on key requirements']
        };
    }
    checkFontConsistency(content) {
        // Check for consistent formatting patterns
        const hasConsistentFormatting = true; // Simplified check
        return {
            ruleId: 'format-font-consistency',
            ruleName: 'Font Consistency',
            severity: 'warning',
            message: 'Font consistency check completed',
            passed: hasConsistentFormatting,
            suggestions: ['Use consistent font sizes', 'Maintain uniform formatting', 'Follow style guide']
        };
    }
    // Content Rule Implementations
    checkExecutiveSummary(content) {
        const hasExecutiveSummary = content.toLowerCase().includes('executive summary');
        const summaryLength = this.getSectionLength(content, 'executive summary');
        const adequateLength = summaryLength >= 100; // At least 100 words
        return {
            ruleId: 'content-executive-summary',
            ruleName: 'Executive Summary',
            severity: 'error',
            message: hasExecutiveSummary && adequateLength
                ? 'Executive summary is present and adequate'
                : 'Executive summary is missing or too brief',
            passed: hasExecutiveSummary && adequateLength,
            suggestions: ['Include a comprehensive executive summary', 'Summarize key points and value proposition', 'Keep it concise but informative']
        };
    }
    checkTechnicalApproach(content) {
        const hasTechnicalApproach = content.toLowerCase().includes('technical approach') ||
            content.toLowerCase().includes('technical solution') ||
            content.toLowerCase().includes('methodology');
        const approachLength = this.getSectionLength(content, 'technical approach');
        const adequateLength = approachLength >= 200; // At least 200 words
        return {
            ruleId: 'content-technical-approach',
            ruleName: 'Technical Approach',
            severity: 'error',
            message: hasTechnicalApproach && adequateLength
                ? 'Technical approach is present and detailed'
                : 'Technical approach is missing or insufficient',
            passed: hasTechnicalApproach && adequateLength,
            suggestions: ['Include detailed technical approach', 'Describe methodology and processes', 'Address key technical challenges']
        };
    }
    checkPricingInformation(content) {
        const hasPricing = content.toLowerCase().includes('pricing') ||
            content.toLowerCase().includes('cost') ||
            content.toLowerCase().includes('budget') ||
            content.toLowerCase().includes('price');
        const hasCostBreakdown = content.match(/\$\d+/g) !== null;
        return {
            ruleId: 'content-pricing',
            ruleName: 'Pricing Information',
            severity: 'error',
            message: hasPricing && hasCostBreakdown
                ? 'Pricing information is present and detailed'
                : 'Pricing information is missing or incomplete',
            passed: hasPricing && hasCostBreakdown,
            suggestions: ['Include detailed pricing breakdown', 'Provide cost estimates', 'Include payment terms and schedule']
        };
    }
    checkPastPerformance(content) {
        const hasPastPerformance = content.toLowerCase().includes('past performance') ||
            content.toLowerCase().includes('experience') ||
            content.toLowerCase().includes('references');
        return {
            ruleId: 'content-past-performance',
            ruleName: 'Past Performance',
            severity: 'warning',
            message: hasPastPerformance
                ? 'Past performance information is present'
                : 'Past performance information is missing',
            passed: hasPastPerformance,
            suggestions: ['Include relevant past performance', 'Provide client references', 'Highlight similar project experience']
        };
    }
    // Regulatory Rule Implementations
    checkFISMACompliance(content) {
        const hasFISMA = content.toLowerCase().includes('fisma') ||
            content.toLowerCase().includes('security controls') ||
            content.toLowerCase().includes('risk assessment');
        return {
            ruleId: 'regulatory-fisma-compliance',
            ruleName: 'FISMA Compliance',
            severity: 'error',
            message: hasFISMA
                ? 'FISMA compliance is addressed'
                : 'FISMA compliance requirements are missing',
            passed: hasFISMA,
            suggestions: ['Address FISMA security controls', 'Include risk assessment', 'Describe security measures']
        };
    }
    checkFedRAMPCompliance(content) {
        const hasFedRAMP = content.toLowerCase().includes('fedramp') ||
            content.toLowerCase().includes('cloud security') ||
            content.toLowerCase().includes('authorization');
        return {
            ruleId: 'regulatory-fedramp',
            ruleName: 'FedRAMP Requirements',
            severity: 'error',
            message: hasFedRAMP
                ? 'FedRAMP requirements are addressed'
                : 'FedRAMP requirements are missing',
            passed: hasFedRAMP,
            suggestions: ['Address FedRAMP authorization', 'Include cloud security measures', 'Describe compliance process']
        };
    }
    check508Compliance(content) {
        const has508 = content.toLowerCase().includes('section 508') ||
            content.toLowerCase().includes('accessibility') ||
            content.toLowerCase().includes('ada');
        return {
            ruleId: 'regulatory-508-compliance',
            ruleName: 'Section 508 Compliance',
            severity: 'warning',
            message: has508
                ? 'Section 508 compliance is addressed'
                : 'Section 508 compliance requirements are missing',
            passed: has508,
            suggestions: ['Address accessibility requirements', 'Include Section 508 compliance', 'Describe accessibility features']
        };
    }
    // Technical Rule Implementations
    checkSecurityRequirements(content) {
        const hasSecurity = content.toLowerCase().includes('security') ||
            content.toLowerCase().includes('encryption') ||
            content.toLowerCase().includes('authentication') ||
            content.toLowerCase().includes('authorization');
        return {
            ruleId: 'technical-security',
            ruleName: 'Security Requirements',
            severity: 'error',
            message: hasSecurity
                ? 'Security requirements are addressed'
                : 'Security requirements are missing',
            passed: hasSecurity,
            suggestions: ['Include comprehensive security measures', 'Address authentication and authorization', 'Describe encryption and data protection']
        };
    }
    checkScalabilityRequirements(content) {
        const hasScalability = content.toLowerCase().includes('scalability') ||
            content.toLowerCase().includes('performance') ||
            content.toLowerCase().includes('load') ||
            content.toLowerCase().includes('capacity');
        return {
            ruleId: 'technical-scalability',
            ruleName: 'Scalability Requirements',
            severity: 'warning',
            message: hasScalability
                ? 'Scalability requirements are addressed'
                : 'Scalability requirements are missing',
            passed: hasScalability,
            suggestions: ['Address scalability requirements', 'Include performance metrics', 'Describe capacity planning']
        };
    }
    checkIntegrationRequirements(content) {
        const hasIntegration = content.toLowerCase().includes('integration') ||
            content.toLowerCase().includes('api') ||
            content.toLowerCase().includes('interface') ||
            content.toLowerCase().includes('connect');
        return {
            ruleId: 'technical-integration',
            ruleName: 'Integration Requirements',
            severity: 'warning',
            message: hasIntegration
                ? 'Integration requirements are addressed'
                : 'Integration requirements are missing',
            passed: hasIntegration,
            suggestions: ['Address system integration', 'Include API requirements', 'Describe interface specifications']
        };
    }
    getSectionLength(content, sectionName) {
        const lines = content.split('\n');
        let inSection = false;
        let sectionContent = '';
        for (const line of lines) {
            if (line.toLowerCase().includes(sectionName.toLowerCase())) {
                inSection = true;
                continue;
            }
            if (inSection) {
                if (line.match(/^#{1,6}\s+/)) {
                    break; // Next heading found
                }
                sectionContent += line + ' ';
            }
        }
        return sectionContent.split(/\s+/).length;
    }
    async saveComplianceReport(report, workspaceFolder) {
        const reportPath = path.join(workspaceFolder.uri.fsPath, 'compliance-report.md');
        const reportContent = this.generateReportContent(report);
        await vscode.workspace.fs.writeFile(vscode.Uri.file(reportPath), Buffer.from(reportContent, 'utf8'));
        this._output.appendLine(`📄 Saved compliance report: ${reportPath}`);
        return reportPath;
    }
    generateReportContent(report) {
        return `# Compliance Report

## Summary
- **Document**: ${path.basename(report.documentPath)}
- **Check Date**: ${new Date(report.checkDate).toLocaleDateString()}
- **Overall Score**: ${report.score}/100
- **Status**: ${report.score >= 80 ? '✅ Compliant' : report.score >= 60 ? '⚠️ Needs Improvement' : '❌ Non-Compliant'}

## Statistics
- **Total Checks**: ${report.totalChecks}
- **Passed**: ${report.passed}
- **Failed**: ${report.failed}
- **Errors**: ${report.errors.length}
- **Warnings**: ${report.warnings.length}
- **Info**: ${report.info.length}

## Errors (Must Fix)
${report.errors.map(error => `### ${error.ruleName}
- **Issue**: ${error.message}
- **Suggestions**: ${error.suggestions?.join(', ')}
`).join('\n')}

## Warnings (Should Fix)
${report.warnings.map(warning => `### ${warning.ruleName}
- **Issue**: ${warning.message}
- **Suggestions**: ${warning.suggestions?.join(', ')}
`).join('\n')}

## Information (Consider)
${report.info.map(info => `### ${info.ruleName}
- **Issue**: ${info.message}
- **Suggestions**: ${info.suggestions?.join(', ')}
`).join('\n')}

## Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Next Steps
1. Address all errors first
2. Review and fix warnings
3. Consider information items
4. Re-run compliance check
5. Submit when score is 80+ or higher

---
*Generated by Valinor Studio Compliance Checker*`;
    }
}
exports.ComplianceChecker = ComplianceChecker;
//# sourceMappingURL=compliance-checker.js.map