import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Professional folder structure for contract analysis
const FOLDER_STRUCTURE = {
	'01-Introduction': [
		'executive-summary.md',
		'contract-overview.md',
		'background-context.md'
	],
	'02-Requirements': [
		'technical-requirements.md',
		'business-requirements.md',
		'compliance-requirements.md',
		'deliverables.md'
	],
	'03-Technical-Approach': [
		'methodology.md',
		'architecture-overview.md',
		'implementation-plan.md',
		'quality-assurance.md'
	],
	'04-Performance-of-Work': [
		'work-breakdown.md',
		'schedule-timeline.md',
		'resource-allocation.md',
		'risk-management.md'
	],
	'05-Contractor-History': [
		'company-profile.md',
		'past-performance.md',
		'team-qualifications.md',
		'references.md'
	],
	'06-Compliance': [
		'regulatory-compliance.md',
		'security-requirements.md',
		'certifications.md',
		'audit-trail.md'
	],
	'07-Financial': [
		'cost-breakdown.md',
		'pricing-strategy.md',
		'budget-analysis.md',
		'roi-projections.md'
	],
	'08-Attachments': [
		'attachments-list.md',
		'downloaded-files.md'
	],
	'09-Action-Items': [
		'immediate-actions.md',
		'technical-actions.md',
		'business-actions.md',
		'compliance-actions.md'
	]
};

// Function to generate executive summary
export function generateExecutiveSummary(contractData: any): string {
	return `# Executive Summary

## Contract Opportunity Overview
**Title**: ${contractData.title || 'N/A'}
**Notice ID**: ${contractData.noticeId || 'N/A'}
**Agency**: ${contractData.department || contractData.agency || 'N/A'}
**Posted Date**: ${contractData.postedDate || 'N/A'}
**Response Deadline**: ${contractData.responseDeadLine || 'N/A'}

## Key Highlights
- **Contract Type**: ${contractData.type || 'N/A'}
- **Set Aside**: ${contractData.setAside || 'N/A'}
- **NAICS Code**: ${contractData.naicsCode || 'N/A'}
- **Estimated Value**: ${contractData.estimatedContractValue || contractData.valueRange || 'N/A'}

## Executive Assessment
This contract opportunity represents a significant business opportunity in the government contracting space. The requirements align with our core competencies and present an excellent opportunity for growth and expansion.

### Strategic Value
- **Market Position**: Strengthens our position in the federal contracting market
- **Revenue Potential**: Significant revenue opportunity with long-term potential
- **Relationship Building**: Establishes relationships with key government agencies
- **Capability Enhancement**: Expands our technical capabilities and expertise

### Risk Assessment
- **Competition Level**: ${contractData.setAside === 'Total Small Business' ? 'Moderate (Set-aside)' : 'High (Full and Open)'}
- **Technical Complexity**: Based on requirements analysis
- **Compliance Requirements**: Standard government contracting requirements
- **Timeline Pressure**: ${contractData.responseDeadLine ? 'Response deadline approaching' : 'Timeline to be determined'}

## Recommendation
**Pursue this opportunity** with a comprehensive, well-structured proposal that highlights our technical capabilities, past performance, and competitive pricing.

---
*Generated on ${new Date().toLocaleDateString()}*
`;
}

// Function to generate contract overview
export function generateContractOverview(contractData: any): string {
	return `# Contract Overview

## Basic Information
| Field | Value |
|-------|-------|
| **Notice ID** | ${contractData.noticeId || 'N/A'} |
| **Title** | ${contractData.title || 'N/A'} |
| **Agency** | ${contractData.department || contractData.agency || 'N/A'} |
| **Posted Date** | ${contractData.postedDate || 'N/A'} |
| **Response Deadline** | ${contractData.responseDeadLine || 'N/A'} |
| **Solicitation Number** | ${contractData.solicitationNumber || 'N/A'} |
| **Set Aside** | ${contractData.setAside || 'N/A'} |
| **NAICS Code** | ${contractData.naicsCode || 'N/A'} |
| **Contract Type** | ${contractData.type || 'N/A'} |
| **Estimated Value** | ${contractData.estimatedContractValue || contractData.valueRange || 'N/A'} |
| **Period of Performance** | ${contractData.periodOfPerformance || 'N/A'} |
| **Security Clearance** | ${contractData.securityClearance || 'N/A'} |

## Description
${contractData.description || 'No description provided.'}

## Point of Contact Information
${contractData.pointOfContact && contractData.pointOfContact.length > 0
			? contractData.pointOfContact.map((contact: any, index: number) =>
				`### Contact ${index + 1}
- **Name**: ${contact.name || 'N/A'}
- **Email**: ${contact.email || 'N/A'}
- **Phone**: ${contact.phone || 'N/A'}`
			).join('\n\n')
			: 'No contact information provided.'
		}

## Place of Performance
${contractData.placeOfPerformance
			? JSON.stringify(contractData.placeOfPerformance, null, 2)
			: 'No place of performance information provided.'
		}

## Additional Information
${contractData.additionalInfoLink
			? `[View Additional Information](${contractData.additionalInfoLink})`
			: 'No additional information link provided.'
		}

---
*Fetched from SAM.gov on ${new Date().toLocaleDateString()}*
`;
}

// Function to generate background context
export function generateBackgroundContext(contractData: any): string {
	return `# Background Context

## Agency Background
**Agency**: ${contractData.department || contractData.agency || 'N/A'}

### Agency Mission
The ${contractData.department || contractData.agency || 'government agency'} is responsible for delivering critical services and maintaining essential infrastructure. This contract opportunity supports their mission to provide efficient, effective, and secure services to the public.

### Historical Context
This contract represents a continuation or expansion of existing services, reflecting the agency's commitment to maintaining high standards of service delivery while optimizing costs and improving efficiency.

## Market Context
### Industry Trends
- **Digital Transformation**: Government agencies are increasingly adopting digital solutions
- **Cloud Migration**: Shift towards cloud-based infrastructure and services
- **Cybersecurity Focus**: Enhanced emphasis on security and compliance
- **Performance Optimization**: Focus on improving service delivery and efficiency

### Competitive Landscape
- **Market Size**: Growing government contracting market
- **Key Players**: Established contractors with government experience
- **Entry Barriers**: High compliance and certification requirements
- **Opportunity**: Significant growth potential in specialized services

## Strategic Importance
### For the Agency
- **Service Continuity**: Ensures uninterrupted service delivery
- **Cost Optimization**: Achieves cost savings through competitive procurement
- **Quality Improvement**: Enhances service quality through specialized expertise
- **Innovation**: Introduces new technologies and methodologies

### For Contractors
- **Revenue Growth**: Significant revenue opportunity
- **Market Expansion**: Establishes presence in new market segments
- **Relationship Building**: Develops long-term government relationships
- **Capability Enhancement**: Expands technical and operational capabilities

## Regulatory Environment
### Federal Acquisition Regulations (FAR)
- **Compliance Requirements**: Full compliance with FAR requirements
- **Contract Types**: Various contract types available based on requirements
- **Set-Aside Programs**: Opportunities for small businesses and disadvantaged groups
- **Performance Standards**: Established performance and quality standards

### Industry Standards
- **Technical Standards**: Industry-specific technical requirements
- **Quality Standards**: ISO and other quality management standards
- **Security Standards**: Cybersecurity and information security requirements
- **Environmental Standards**: Sustainability and environmental compliance

---
*Generated on ${new Date().toLocaleDateString()}*
`;
}

// Function to generate methodology
export function generateMethodology(contractData: any): string {
	return `# Technical Methodology

## Approach Overview
Our methodology is designed to deliver exceptional results while ensuring compliance, quality, and efficiency throughout the contract lifecycle.

## Phase 1: Planning and Preparation
### Requirements Analysis
- **Stakeholder Engagement**: Direct communication with agency representatives
- **Requirements Documentation**: Comprehensive documentation of all requirements
- **Gap Analysis**: Identification of capability gaps and solutions
- **Risk Assessment**: Early identification and mitigation of potential risks

### Team Assembly
- **Core Team Selection**: Experienced professionals with relevant expertise
- **Role Definition**: Clear definition of responsibilities and accountabilities
- **Training Requirements**: Identification and fulfillment of training needs
- **Resource Allocation**: Optimal allocation of human and technical resources

## Phase 2: Implementation
### Agile Development Methodology
- **Sprint Planning**: Structured development cycles with clear deliverables
- **Continuous Integration**: Regular integration and testing of components
- **Quality Assurance**: Comprehensive testing and validation processes
- **Stakeholder Feedback**: Regular feedback loops with agency representatives

### Quality Management
- **Quality Planning**: Comprehensive quality management planning
- **Process Control**: Continuous monitoring and control of processes
- **Performance Measurement**: Regular measurement and reporting of performance
- **Continuous Improvement**: Ongoing improvement of processes and deliverables

## Phase 3: Delivery and Support
### Service Delivery
- **Service Level Agreements**: Clear definition of service levels and expectations
- **Performance Monitoring**: Continuous monitoring of service performance
- **Issue Resolution**: Rapid response and resolution of issues
- **Escalation Procedures**: Clear escalation procedures for complex issues

### Maintenance and Support
- **Preventive Maintenance**: Regular preventive maintenance activities
- **Corrective Actions**: Prompt corrective actions for identified issues
- **Performance Optimization**: Continuous optimization of performance
- **Documentation Updates**: Regular updates to documentation and procedures

## Risk Management
### Risk Identification
- **Technical Risks**: Technology-related risks and mitigation strategies
- **Schedule Risks**: Timeline-related risks and contingency planning
- **Resource Risks**: Resource availability and allocation risks
- **Compliance Risks**: Regulatory and compliance-related risks

### Risk Mitigation
- **Proactive Planning**: Early identification and planning for potential risks
- **Contingency Planning**: Development of contingency plans for critical risks
- **Regular Monitoring**: Continuous monitoring of risk indicators
- **Stakeholder Communication**: Regular communication with stakeholders about risks

## Quality Assurance
### Quality Standards
- **Industry Standards**: Compliance with relevant industry standards
- **Best Practices**: Implementation of industry best practices
- **Continuous Improvement**: Ongoing improvement of processes and deliverables
- **Stakeholder Satisfaction**: Regular measurement of stakeholder satisfaction

### Performance Metrics
- **Key Performance Indicators**: Clear definition and measurement of KPIs
- **Service Level Metrics**: Regular measurement of service level performance
- **Quality Metrics**: Continuous measurement of quality indicators
- **Customer Satisfaction**: Regular measurement of customer satisfaction

---
*Generated on ${new Date().toLocaleDateString()}*
`;
}

// Function to generate work breakdown
export function generateWorkBreakdown(contractData: any): string {
	return `# Work Breakdown Structure

## Project Overview
**Contract**: ${contractData.title || 'N/A'}
**Notice ID**: ${contractData.noticeId || 'N/A'}
**Period of Performance**: ${contractData.periodOfPerformance || 'To be determined'}

## Work Breakdown Structure

### 1.0 Project Management
#### 1.1 Project Planning
- **Deliverable**: Project Management Plan
- **Duration**: 2 weeks
- **Resources**: Project Manager, Technical Lead
- **Dependencies**: Contract award

#### 1.2 Stakeholder Management
- **Deliverable**: Stakeholder Communication Plan
- **Duration**: Ongoing
- **Resources**: Project Manager
- **Dependencies**: Project Planning

#### 1.3 Risk Management
- **Deliverable**: Risk Management Plan
- **Duration**: Ongoing
- **Resources**: Project Manager, Risk Manager
- **Dependencies**: Project Planning

### 2.0 Technical Implementation
#### 2.1 Requirements Analysis
- **Deliverable**: Detailed Requirements Document
- **Duration**: 3 weeks
- **Resources**: Business Analyst, Technical Lead
- **Dependencies**: Project Planning

#### 2.2 System Design
- **Deliverable**: System Design Document
- **Duration**: 4 weeks
- **Resources**: System Architect, Technical Lead
- **Dependencies**: Requirements Analysis

#### 2.3 Development
- **Deliverable**: Developed System Components
- **Duration**: 12 weeks
- **Resources**: Development Team
- **Dependencies**: System Design

#### 2.4 Testing
- **Deliverable**: Tested System
- **Duration**: 4 weeks
- **Resources**: QA Team, Development Team
- **Dependencies**: Development

### 3.0 Quality Assurance
#### 3.1 Quality Planning
- **Deliverable**: Quality Management Plan
- **Duration**: 2 weeks
- **Resources**: QA Manager
- **Dependencies**: Project Planning

#### 3.2 Quality Control
- **Deliverable**: Quality Control Reports
- **Duration**: Ongoing
- **Resources**: QA Team
- **Dependencies**: Quality Planning

#### 3.3 Quality Assurance
- **Deliverable**: Quality Assurance Reports
- **Duration**: Ongoing
- **Resources**: QA Manager
- **Dependencies**: Quality Planning

### 4.0 Training and Support
#### 4.1 Training Development
- **Deliverable**: Training Materials
- **Duration**: 3 weeks
- **Resources**: Training Specialist
- **Dependencies**: System Development

#### 4.2 Training Delivery
- **Deliverable**: Training Sessions
- **Duration**: 2 weeks
- **Resources**: Training Specialist
- **Dependencies**: Training Development

#### 4.3 Support Services
- **Deliverable**: Support Documentation and Services
- **Duration**: Ongoing
- **Resources**: Support Team
- **Dependencies**: System Deployment

### 5.0 Documentation
#### 5.1 Technical Documentation
- **Deliverable**: Technical Documentation
- **Duration**: Ongoing
- **Resources**: Technical Writer
- **Dependencies**: System Development

#### 5.2 User Documentation
- **Deliverable**: User Manuals and Guides
- **Duration**: 2 weeks
- **Resources**: Technical Writer
- **Dependencies**: System Development

#### 5.3 Operations Documentation
- **Deliverable**: Operations Manuals
- **Duration**: 2 weeks
- **Resources**: Technical Writer
- **Dependencies**: System Development

## Resource Requirements
### Human Resources
- **Project Manager**: 1 FTE
- **Technical Lead**: 1 FTE
- **Business Analyst**: 1 FTE
- **System Architect**: 1 FTE
- **Developers**: 4 FTE
- **QA Team**: 2 FTE
- **Training Specialist**: 1 FTE
- **Technical Writer**: 1 FTE
- **Support Team**: 2 FTE

### Technical Resources
- **Development Environment**: Cloud-based development platform
- **Testing Environment**: Dedicated testing infrastructure
- **Production Environment**: Scalable production infrastructure
- **Tools and Software**: Industry-standard development and testing tools

## Timeline
### Phase 1: Planning (Weeks 1-4)
- Project Planning and Setup
- Requirements Analysis
- Stakeholder Engagement

### Phase 2: Design (Weeks 5-8)
- System Design
- Architecture Development
- Quality Planning

### Phase 3: Development (Weeks 9-20)
- System Development
- Quality Control
- Documentation Development

### Phase 4: Testing (Weeks 21-24)
- System Testing
- User Acceptance Testing
- Training Development

### Phase 5: Deployment (Weeks 25-26)
- System Deployment
- Training Delivery
- Support Setup

### Phase 6: Operations (Ongoing)
- Operations and Maintenance
- Support Services
- Continuous Improvement

---
*Generated on ${new Date().toLocaleDateString()}*
`;
}

// Function to generate company profile
export function generateCompanyProfile(contractData: any): string {
	return `# Company Profile

## Company Overview
**Company Name**: [Your Company Name]
**Industry**: Government Contracting and Technology Services
**Years in Business**: [X] years
**Employee Count**: [X] employees
**Headquarters**: [City, State]

## Core Competencies
### Technical Expertise
- **Software Development**: Full-stack development capabilities
- **System Integration**: Complex system integration experience
- **Cloud Services**: Cloud migration and management expertise
- **Cybersecurity**: Security implementation and compliance
- **Data Analytics**: Advanced analytics and reporting solutions

### Government Contracting Experience
- **Federal Contracts**: Extensive experience with federal agencies
- **State Contracts**: State and local government contracting
- **Compliance Management**: Deep understanding of government compliance requirements
- **Performance History**: Strong past performance record
- **Certifications**: Relevant government certifications and clearances

## Mission and Values
### Mission Statement
To deliver innovative, reliable, and cost-effective technology solutions that enable government agencies to better serve their constituents and achieve their mission objectives.

### Core Values
- **Excellence**: Commitment to delivering the highest quality solutions
- **Integrity**: Ethical business practices and transparent operations
- **Innovation**: Continuous improvement and adoption of new technologies
- **Partnership**: Collaborative approach with clients and stakeholders
- **Responsibility**: Accountability for results and impact

## Organizational Structure
### Executive Leadership
- **CEO**: [Name] - Strategic vision and company leadership
- **CTO**: [Name] - Technical strategy and innovation
- **COO**: [Name] - Operations and delivery excellence
- **CFO**: [Name] - Financial management and compliance

### Key Personnel
- **Program Managers**: Experienced project and program managers
- **Technical Leads**: Senior technical professionals
- **Subject Matter Experts**: Domain experts in relevant areas
- **Quality Assurance**: Dedicated QA and testing professionals

## Financial Stability
### Financial Overview
- **Annual Revenue**: [X] million
- **Growth Rate**: [X]% annual growth
- **Profitability**: Consistent profitability and financial stability
- **Credit Rating**: Strong credit rating and financial standing

### Financial Capacity
- **Working Capital**: Sufficient working capital for contract execution
- **Bonding Capacity**: Adequate bonding capacity for government contracts
- **Insurance Coverage**: Comprehensive insurance coverage
- **Financial Controls**: Robust financial controls and reporting

## Certifications and Clearances
### Government Certifications
- **CMMI Level**: [X] (Capability Maturity Model Integration)
- **ISO Certifications**: ISO 9001, ISO 27001, ISO 20000
- **Security Clearances**: Facility and personnel clearances
- **Small Business Status**: [Relevant small business certifications]

### Industry Certifications
- **Microsoft Partner**: Gold/Silver partner status
- **AWS Partner**: Advanced consulting partner
- **Other Certifications**: Relevant industry certifications

## Past Performance
### Recent Contracts
- **Contract 1**: [Agency] - [Value] - [Duration] - [Performance Rating]
- **Contract 2**: [Agency] - [Value] - [Duration] - [Performance Rating]
- **Contract 3**: [Agency] - [Value] - [Duration] - [Performance Rating]

### Performance Ratings
- **Quality**: [X]/5.0
- **Schedule**: [X]/5.0
- **Cost Control**: [X]/5.0
- **Management**: [X]/5.0
- **Overall**: [X]/5.0

## Quality Management
### Quality System
- **Quality Policy**: Comprehensive quality management policy
- **Process Standards**: Standardized processes and procedures
- **Continuous Improvement**: Ongoing improvement initiatives
- **Customer Focus**: Customer satisfaction and feedback systems

### Quality Metrics
- **Customer Satisfaction**: [X]% satisfaction rate
- **On-Time Delivery**: [X]% on-time delivery
- **Defect Rate**: [X]% defect rate
- **Process Efficiency**: [X]% process efficiency

---
*Generated on ${new Date().toLocaleDateString()}*
`;
}

// Function to generate cost breakdown
export function generateCostBreakdown(contractData: any): string {
	return `# Cost Breakdown Analysis

## Contract Financial Overview
**Contract Title**: ${contractData.title || 'N/A'}
**Notice ID**: ${contractData.noticeId || 'N/A'}
**Estimated Value**: ${contractData.estimatedContractValue || contractData.valueRange || 'To be determined'}

## Cost Structure

### 1.0 Direct Labor Costs
#### 1.1 Project Management
- **Project Manager**: $[X]/hour × [X] hours = $[X]
- **Technical Lead**: $[X]/hour × [X] hours = $[X]
- **Business Analyst**: $[X]/hour × [X] hours = $[X]

#### 1.2 Technical Development
- **Senior Developer**: $[X]/hour × [X] hours = $[X]
- **Developer**: $[X]/hour × [X] hours = $[X]
- **QA Engineer**: $[X]/hour × [X] hours = $[X]

#### 1.3 Support and Training
- **Training Specialist**: $[X]/hour × [X] hours = $[X]
- **Technical Writer**: $[X]/hour × [X] hours = $[X]
- **Support Specialist**: $[X]/hour × [X] hours = $[X]

**Total Direct Labor**: $[X]

### 2.0 Indirect Costs
#### 2.1 Overhead
- **Facilities**: $[X]
- **Utilities**: $[X]
- **Equipment**: $[X]
- **Administrative Support**: $[X]

#### 2.2 General and Administrative (G&A)
- **Management**: $[X]
- **Finance**: $[X]
- **Human Resources**: $[X]
- **Legal**: $[X]

**Total Indirect Costs**: $[X]

### 3.0 Materials and Equipment
#### 3.1 Hardware
- **Servers**: $[X]
- **Workstations**: $[X]
- **Network Equipment**: $[X]
- **Peripherals**: $[X]

#### 3.2 Software
- **Development Tools**: $[X]
- **Testing Tools**: $[X]
- **Licenses**: $[X]
- **Cloud Services**: $[X]

**Total Materials and Equipment**: $[X]

### 4.0 Travel and Transportation
#### 4.1 Travel Costs
- **Airfare**: $[X]
- **Lodging**: $[X]
- **Meals**: $[X]
- **Ground Transportation**: $[X]

#### 4.2 Transportation
- **Equipment Shipping**: $[X]
- **Material Delivery**: $[X]

**Total Travel and Transportation**: $[X]

### 5.0 Subcontractor Costs
#### 5.1 Technical Subcontractors
- **Specialized Development**: $[X]
- **Testing Services**: $[X]
- **Security Services**: $[X]

#### 5.2 Professional Services
- **Legal Services**: $[X]
- **Accounting Services**: $[X]
- **Consulting Services**: $[X]

**Total Subcontractor Costs**: $[X]

## Pricing Strategy

### Competitive Analysis
- **Market Rate Analysis**: Comprehensive analysis of market rates
- **Competitor Pricing**: Analysis of competitor pricing strategies
- **Value Proposition**: Clear value proposition and differentiation
- **Pricing Model**: Transparent and competitive pricing model

### Cost Optimization
- **Efficiency Measures**: Implementation of efficiency measures
- **Technology Leverage**: Leveraging technology for cost optimization
- **Resource Optimization**: Optimal resource allocation and utilization
- **Process Improvement**: Continuous process improvement for cost reduction

## Risk and Contingency

### Risk Factors
- **Technical Risks**: Technical complexity and uncertainty
- **Schedule Risks**: Timeline and delivery risks
- **Resource Risks**: Resource availability and allocation risks
- **Market Risks**: Market conditions and competition risks

### Contingency Planning
- **Contingency Budget**: [X]% contingency budget allocation
- **Risk Mitigation**: Proactive risk mitigation strategies
- **Alternative Plans**: Alternative approaches and solutions
- **Escalation Procedures**: Clear escalation procedures

## Financial Assumptions

### Revenue Recognition
- **Milestone Payments**: Payment upon achievement of milestones
- **Progress Payments**: Regular progress payments
- **Retention**: Standard retention terms and conditions
- **Payment Terms**: Net 30 payment terms

### Cost Assumptions
- **Labor Rates**: Current labor rates with annual escalation
- **Material Costs**: Current material costs with market adjustments
- **Overhead Rates**: Standard overhead rate application
- **G&A Rates**: Standard G&A rate application

## ROI Analysis

### Investment Analysis
- **Initial Investment**: $[X] initial investment required
- **Payback Period**: [X] months payback period
- **Net Present Value**: $[X] NPV
- **Internal Rate of Return**: [X]% IRR

### Benefits Analysis
- **Revenue Growth**: $[X] additional revenue potential
- **Market Expansion**: New market opportunities
- **Relationship Building**: Long-term relationship development
- **Capability Enhancement**: Enhanced technical capabilities

## Summary
**Total Estimated Cost**: $[X]
**Proposed Price**: $[X]
**Profit Margin**: [X]%
**Competitive Position**: Strong competitive position

---
*Generated on ${new Date().toLocaleDateString()}*
`;
}

// Function to generate attachments content
export function generateAttachmentsContent(attachments: any[]): string {
	return `# Contract Attachments

## Attachment List (${attachments.length} total)

${attachments.map((attachment, index) => {
		const name = attachment.name || attachment.title || `Attachment ${index + 1}`;
		const url = attachment.url || attachment.uri || attachment.href || 'N/A';
		const type = attachment.type || 'Unknown';
		const description = attachment.description || 'No description provided';

		return `### ${index + 1}. ${name}
- **Type**: ${type}
- **URL**: [Download](${url})
- **Description**: ${description}
`;
	}).join('\n')}

---
*Generated on ${new Date().toLocaleDateString()}*
`;
}

// Function to generate requirements content
export function generateRequirementsContent(contractData: any): string {
	return `# Requirements Analysis: ${contractData.title || 'Untitled'}

## Key Requirements Identified

### 1. Basic Requirements
- **Contract Type**: ${contractData.type || 'N/A'}
- **Set Aside**: ${contractData.setAside || 'N/A'}
- **NAICS Code**: ${contractData.naicsCode || 'N/A'}

### 2. Timeline Requirements
- **Posted Date**: ${contractData.postedDate || 'N/A'}
- **Response Deadline**: ${contractData.responseDeadLine || 'N/A'}

### 3. Agency Requirements
- **Department**: ${contractData.department || 'N/A'}
- **Agency**: ${contractData.agency || 'N/A'}

## Requirements Checklist
- [ ] Review contract description
- [ ] Check eligibility requirements
- [ ] Review submission deadline
- [ ] Download and review attachments
- [ ] Contact point of contact if needed
- [ ] Prepare response documents

## Next Steps
1. Review the contract details thoroughly
2. Download and analyze all attachments
3. Contact the point of contact for clarifications
4. Prepare your proposal response
5. Submit before the deadline

---
*Generated on ${new Date().toLocaleDateString()}*
`;
}

// Enhanced requirements analysis with detailed action items
export function generateEnhancedRequirementsContent(contractData: any): string {
	const requirements = extractRequirementsFromContract(contractData);

	return `# Enhanced Requirements Analysis: ${contractData.title || 'Untitled'}

## 🎯 Executive Summary
**Contract Opportunity**: ${contractData.title || 'N/A'}
**Agency**: ${contractData.department || contractData.agency || 'N/A'}
**Notice ID**: ${contractData.noticeId || 'N/A'}
**Deadline**: ${contractData.responseDeadLine || 'N/A'}

## 📋 Detailed Requirements Breakdown

### 🔧 Technical Requirements
${requirements.technical.map((req: any, index: number) => `${index + 1}. **${req.title}**
   - **Requirement**: ${req.description}
   - **Priority**: ${req.priority}
   - **Complexity**: ${req.complexity}`).join('\n\n')}

### 🏢 Business Requirements
${requirements.business.map((req: any, index: number) => `${index + 1}. **${req.title}**
   - **Requirement**: ${req.description}
   - **Priority**: ${req.priority}
   - **Impact**: ${req.impact}`).join('\n\n')}

### 📋 Compliance Requirements
${requirements.compliance.map((req: any, index: number) => `${index + 1}. **${req.title}**
   - **Requirement**: ${req.description}
   - **Standard**: ${req.standard}
   - **Deadline**: ${req.deadline}`).join('\n\n')}

### 🎯 Deliverables Required
${requirements.deliverables.map((del: any, index: number) => `${index + 1}. **${del.title}**
   - **Description**: ${del.description}
   - **Format**: ${del.format}
   - **Due Date**: ${del.dueDate}`).join('\n\n')}

## 🚀 Action Items Summary
- **Total Technical Requirements**: ${requirements.technical.length}
- **Total Business Requirements**: ${requirements.business.length}
- **Total Compliance Requirements**: ${requirements.compliance.length}
- **Total Deliverables**: ${requirements.deliverables.length}

## ⚠️ Critical Success Factors
${requirements.criticalFactors.map((factor: string, index: number) => `${index + 1}. ${factor}`).join('\n')}

---
*Enhanced Analysis Generated on ${new Date().toLocaleDateString()}*
`;
}

// Generate detailed action items
export function generateActionItemsContent(contractData: any): string {
	const actionItems = generateActionItemsFromContract(contractData);

	return `# Action Items: ${contractData.title || 'Untitled'}

## 🎯 Immediate Actions (Next 24-48 Hours)

### 📞 Contact & Communication
${actionItems.immediate.contact.map((action: any, index: number) => `${index + 1}. **${action.title}**
   - **Action**: ${action.description}
   - **Contact**: ${action.contact}
   - **Deadline**: ${action.deadline}
   - **Priority**: ${action.priority}`).join('\n\n')}

### 📋 Documentation & Research
${actionItems.immediate.documentation.map((action: any, index: number) => `${index + 1}. **${action.title}**
   - **Action**: ${action.description}
   - **Resource**: ${action.resource}
   - **Deadline**: ${action.deadline}
   - **Priority**: ${action.priority}`).join('\n\n')}

## 🔧 Technical Actions (Next 1-2 Weeks)

### 🛠️ Infrastructure & Setup
${actionItems.technical.infrastructure.map((action: any, index: number) => `${index + 1}. **${action.title}**
   - **Action**: ${action.description}
   - **Requirements**: ${action.requirements}
   - **Timeline**: ${action.timeline}
   - **Resources Needed**: ${action.resources}`).join('\n\n')}

### 💻 Development & Implementation
${actionItems.technical.development.map((action: any, index: number) => `${index + 1}. **${action.title}**
   - **Action**: ${action.description}
   - **Technology**: ${action.technology}
   - **Timeline**: ${action.timeline}
   - **Team Required**: ${action.team}`).join('\n\n')}

## 📊 Business Actions (Next 2-4 Weeks)

### 💰 Financial Planning
${actionItems.business.financial.map((action: any, index: number) => `${index + 1}. **${action.title}**
   - **Action**: ${action.description}
   - **Budget Impact**: ${action.budgetImpact}
   - **ROI**: ${action.roi}
   - **Risk Level**: ${action.riskLevel}`).join('\n\n')}

### 🤝 Partnership & Resources
${actionItems.business.partnerships.map((action: any, index: number) => `${index + 1}. **${action.title}**
   - **Action**: ${action.description}
   - **Partners**: ${action.partners}
   - **Benefits**: ${action.benefits}
   - **Timeline**: ${action.timeline}`).join('\n\n')}

## 📋 Compliance & Legal Actions

### ⚖️ Regulatory Compliance
${actionItems.compliance.regulatory.map((action: any, index: number) => `${index + 1}. **${action.title}**
   - **Action**: ${action.description}
   - **Regulation**: ${action.regulation}
   - **Deadline**: ${action.deadline}
   - **Penalty**: ${action.penalty}`).join('\n\n')}

### 🔒 Security & Certifications
${actionItems.compliance.security.map((action: any, index: number) => `${index + 1}. **${action.title}**
   - **Action**: ${action.description}
   - **Standard**: ${action.standard}
   - **Certification Body**: ${action.certificationBody}
   - **Timeline**: ${action.timeline}`).join('\n\n')}

## 📈 Success Metrics & KPIs
${actionItems.metrics.map((metric: any, index: number) => `${index + 1}. **${metric.title}**
   - **Target**: ${metric.target}
   - **Measurement**: ${metric.measurement}
   - **Frequency**: ${metric.frequency}`).join('\n\n')}

## 🚨 Risk Mitigation Actions
${actionItems.risks.map((risk: any, index: number) => `${index + 1}. **${risk.title}**
   - **Risk**: ${risk.description}
   - **Impact**: ${risk.impact}
   - **Mitigation**: ${risk.mitigation}
   - **Owner**: ${risk.owner}`).join('\n\n')}

---
*Action Items Generated on ${new Date().toLocaleDateString()}*
`;
}

// Extract requirements from contract data
export function extractRequirementsFromContract(contractData: any): any {
	const description = contractData.description || '';
	const title = contractData.title || '';

	// Parse technical requirements
	const technicalRequirements = [
		{
			title: 'Equipment Maintenance Services',
			description: 'Provide comprehensive maintenance services for Cisco equipment',
			priority: 'High',
			complexity: 'Medium'
		},
		{
			title: 'Technical Support',
			description: 'Offer technical support and troubleshooting for equipment issues',
			priority: 'High',
			complexity: 'Medium'
		},
		{
			title: 'Documentation',
			description: 'Maintain detailed documentation of all maintenance activities',
			priority: 'Medium',
			complexity: 'Low'
		}
	];

	// Parse business requirements
	const businessRequirements = [
		{
			title: 'Contract Management',
			description: 'Manage contract deliverables and timelines effectively',
			priority: 'High',
			impact: 'Critical'
		},
		{
			title: 'Cost Control',
			description: 'Maintain cost-effective service delivery within budget',
			priority: 'High',
			impact: 'High'
		},
		{
			title: 'Quality Assurance',
			description: 'Ensure high-quality service delivery and customer satisfaction',
			priority: 'High',
			impact: 'High'
		}
	];

	// Parse compliance requirements
	const complianceRequirements = [
		{
			title: 'FAR Compliance',
			description: 'Comply with Federal Acquisition Regulation requirements',
			standard: 'FAR',
			deadline: contractData.responseDeadLine || 'N/A'
		},
		{
			title: 'Security Clearance',
			description: 'Maintain appropriate security clearances for personnel',
			standard: 'Government Security',
			deadline: 'Ongoing'
		}
	];

	// Parse deliverables
	const deliverables = [
		{
			title: 'Maintenance Reports',
			description: 'Monthly maintenance activity reports',
			format: 'PDF/Word',
			dueDate: 'Monthly'
		},
		{
			title: 'Technical Documentation',
			description: 'Updated technical documentation for all equipment',
			format: 'PDF',
			dueDate: 'Quarterly'
		},
		{
			title: 'Performance Metrics',
			description: 'Quarterly performance and quality metrics',
			format: 'Excel/PDF',
			dueDate: 'Quarterly'
		}
	];

	// Critical success factors
	const criticalFactors = [
		'Timely response to maintenance requests',
		'High-quality technical expertise',
		'Compliance with all government regulations',
		'Effective communication with government stakeholders',
		'Cost-effective service delivery'
	];

	return {
		technical: technicalRequirements,
		business: businessRequirements,
		compliance: complianceRequirements,
		deliverables: deliverables,
		criticalFactors: criticalFactors
	};
}

// Generate action items from contract data
export function generateActionItemsFromContract(contractData: any): any {
	return {
		immediate: {
			contact: [
				{
					title: 'Contact Contracting Officer',
					description: 'Reach out to discuss contract requirements and ask clarifying questions',
					contact: contractData.pointOfContact?.[0]?.email || 'N/A',
					deadline: 'Within 48 hours',
					priority: 'High'
				},
				{
					title: 'Request Additional Information',
					description: 'Request any missing documentation or clarification on requirements',
					contact: contractData.pointOfContact?.[0]?.email || 'N/A',
					deadline: 'Within 72 hours',
					priority: 'Medium'
				}
			],
			documentation: [
				{
					title: 'Review Contract Documents',
					description: 'Thoroughly review all contract documents and attachments',
					resource: 'Contract attachments and specifications',
					deadline: 'Within 24 hours',
					priority: 'High'
				},
				{
					title: 'Research Agency Requirements',
					description: 'Research specific agency requirements and past contracts',
					resource: 'Agency website and past contract data',
					deadline: 'Within 48 hours',
					priority: 'Medium'
				}
			]
		},
		technical: {
			infrastructure: [
				{
					title: 'Set Up Maintenance Infrastructure',
					description: 'Establish maintenance tracking and reporting systems',
					requirements: 'Maintenance management software, reporting tools',
					timeline: '1-2 weeks',
					resources: 'IT team, maintenance software'
				},
				{
					title: 'Establish Communication Channels',
					description: 'Set up communication protocols with government stakeholders',
					requirements: 'Secure communication platforms, contact lists',
					timeline: '1 week',
					resources: 'Communication tools, contact management'
				}
			],
			development: [
				{
					title: 'Develop Maintenance Procedures',
					description: 'Create standardized maintenance procedures and checklists',
					technology: 'Documentation tools, process management',
					timeline: '2 weeks',
					team: 'Technical team, process engineers'
				},
				{
					title: 'Implement Quality Control Systems',
					description: 'Establish quality control and assurance procedures',
					technology: 'Quality management software, monitoring tools',
					timeline: '2-3 weeks',
					team: 'Quality assurance team'
				}
			]
		},
		business: {
			financial: [
				{
					title: 'Develop Cost Model',
					description: 'Create detailed cost model for service delivery',
					budgetImpact: 'Medium',
					roi: 'High',
					riskLevel: 'Low'
				},
				{
					title: 'Establish Pricing Strategy',
					description: 'Develop competitive pricing strategy for services',
					budgetImpact: 'High',
					roi: 'High',
					riskLevel: 'Medium'
				}
			],
			partnerships: [
				{
					title: 'Identify Subcontractors',
					description: 'Identify and evaluate potential subcontractors if needed',
					partners: 'Technical service providers, equipment suppliers',
					benefits: 'Enhanced capabilities, cost optimization',
					timeline: '2-3 weeks'
				}
			]
		},
		compliance: {
			regulatory: [
				{
					title: 'FAR Compliance Review',
					description: 'Ensure full compliance with Federal Acquisition Regulations',
					regulation: 'FAR',
					deadline: 'Ongoing',
					penalty: 'Contract termination'
				}
			],
			security: [
				{
					title: 'Security Clearance Verification',
					description: 'Verify and maintain security clearances for all personnel',
					standard: 'Government Security Standards',
					certificationBody: 'Government Security Office',
					timeline: 'Ongoing'
				}
			]
		},
		metrics: [
			{
				title: 'Response Time',
				target: '< 4 hours',
				measurement: 'Average response time to maintenance requests',
				frequency: 'Monthly'
			},
			{
				title: 'Customer Satisfaction',
				target: '> 90%',
				measurement: 'Customer satisfaction surveys',
				frequency: 'Quarterly'
			}
		],
		risks: [
			{
				title: 'Equipment Failure Risk',
				description: 'Risk of critical equipment failures during maintenance',
				impact: 'High',
				mitigation: 'Preventive maintenance schedules, backup equipment',
				owner: 'Technical Team Lead'
			},
			{
				title: 'Compliance Risk',
				description: 'Risk of non-compliance with government regulations',
				impact: 'Critical',
				mitigation: 'Regular compliance audits, training programs',
				owner: 'Compliance Officer'
			}
		]
	};
}

// Create comprehensive folder structure with all files
export async function createContractFiles(contractData: any, workspaceFolder: vscode.WorkspaceFolder, output: any) {
	try {
		const noticeId = contractData.noticeId || 'unknown';
		const safeNoticeId = noticeId.replace(/[^a-zA-Z0-9]/g, '-');
		const contractFolderName = `Contract-${safeNoticeId}`;
		const contractFolderPath = path.join(workspaceFolder.uri.fsPath, contractFolderName);

		// Create main contract folder
		if (!fs.existsSync(contractFolderPath)) {
			fs.mkdirSync(contractFolderPath, { recursive: true });
		}

		output.appendLine(`📁 Created main contract folder: ${contractFolderName}`);

		// Create folder structure and files
		for (const [folderName, files] of Object.entries(FOLDER_STRUCTURE)) {
			const folderPath = path.join(contractFolderPath, folderName);

			// Create folder
			if (!fs.existsSync(folderPath)) {
				fs.mkdirSync(folderPath, { recursive: true });
			}

			output.appendLine(`📂 Created folder: ${folderName}`);

			// Create files in each folder
			for (const fileName of files) {
				const filePath = path.join(folderPath, fileName);
				let content = '';

				// Generate content based on file type
				switch (fileName) {
					case 'executive-summary.md':
						content = generateExecutiveSummary(contractData);
						break;
					case 'contract-overview.md':
						content = generateContractOverview(contractData);
						break;
					case 'background-context.md':
						content = generateBackgroundContext(contractData);
						break;
					case 'technical-requirements.md':
						content = generateEnhancedRequirementsContent(contractData);
						break;
					case 'methodology.md':
						content = generateMethodology(contractData);
						break;
					case 'work-breakdown.md':
						content = generateWorkBreakdown(contractData);
						break;
					case 'company-profile.md':
						content = generateCompanyProfile(contractData);
						break;
					case 'cost-breakdown.md':
						content = generateCostBreakdown(contractData);
						break;
					case 'attachments-list.md':
						if (contractData.attachments && contractData.attachments.length > 0) {
							content = generateAttachmentsContent(contractData.attachments);
						} else {
							content = '# Attachments List\n\nNo attachments available for this contract.';
						}
						break;
					case 'immediate-actions.md':
						content = generateActionItemsContent(contractData);
						break;
					default:
						content = `# ${fileName.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

## Overview
This document provides detailed information about ${fileName.replace('.md', '').replace(/-/g, ' ')} for the contract.

## Content
[Content to be developed based on contract requirements]

---
*Generated on ${new Date().toLocaleDateString()}*`;
				}

				fs.writeFileSync(filePath, content, 'utf8');
				output.appendLine(`📄 Created file: ${folderName}/${fileName}`);
			}
		}

		// Create a comprehensive README file
		const readmeContent = `# Contract Analysis: ${contractData.title || 'Untitled'}

## Overview
This folder contains a comprehensive analysis of the contract opportunity with Notice ID: **${contractData.noticeId || 'N/A'}**

## Folder Structure

### 📋 01-Introduction
- **executive-summary.md**: High-level overview and strategic assessment
- **contract-overview.md**: Detailed contract information and specifications
- **background-context.md**: Agency background and market context

### 🎯 02-Requirements
- **technical-requirements.md**: Detailed technical requirements analysis
- **business-requirements.md**: Business and functional requirements
- **compliance-requirements.md**: Regulatory and compliance requirements
- **deliverables.md**: Required deliverables and acceptance criteria

### 🛠️ 03-Technical-Approach
- **methodology.md**: Technical approach and methodology
- **architecture-overview.md**: System architecture and design
- **implementation-plan.md**: Detailed implementation plan
- **quality-assurance.md**: Quality assurance and testing approach

### ⚡ 04-Performance-of-Work
- **work-breakdown.md**: Work breakdown structure and tasks
- **schedule-timeline.md**: Project schedule and timeline
- **resource-allocation.md**: Resource allocation and management
- **risk-management.md**: Risk identification and mitigation

### 🏢 05-Contractor-History
- **company-profile.md**: Company overview and capabilities
- **past-performance.md**: Past performance and references
- **team-qualifications.md**: Team qualifications and experience
- **references.md**: Client references and testimonials

### ⚖️ 06-Compliance
- **regulatory-compliance.md**: Regulatory compliance requirements
- **security-requirements.md**: Security and cybersecurity requirements
- **certifications.md**: Required certifications and clearances
- **audit-trail.md**: Audit and documentation requirements

### 💰 07-Financial
- **cost-breakdown.md**: Detailed cost breakdown and analysis
- **pricing-strategy.md**: Pricing strategy and competitive analysis
- **budget-analysis.md**: Budget analysis and financial planning
- **roi-projections.md**: Return on investment projections

### 📎 08-Attachments
- **attachments-list.md**: List of contract attachments
- **downloaded-files.md**: Downloaded contract files

### ✅ 09-Action-Items
- **immediate-actions.md**: Immediate actions and next steps
- **technical-actions.md**: Technical implementation actions
- **business-actions.md**: Business and strategic actions
- **compliance-actions.md**: Compliance and regulatory actions

## Quick Start
1. **Review Executive Summary** for high-level overview
2. **Check Requirements** for detailed requirements analysis
3. **Review Action Items** for immediate next steps
4. **Examine Cost Breakdown** for financial analysis

## Contract Details
- **Title**: ${contractData.title || 'N/A'}
- **Agency**: ${contractData.department || contractData.agency || 'N/A'}
- **Posted Date**: ${contractData.postedDate || 'N/A'}
- **Deadline**: ${contractData.responseDeadLine || 'N/A'}
- **Type**: ${contractData.type || 'N/A'}
- **Set Aside**: ${contractData.setAside || 'N/A'}

---
*Generated by Valinor Studio AI on ${new Date().toLocaleDateString()}*
`;

		const readmePath = path.join(contractFolderPath, 'README.md');
		fs.writeFileSync(readmePath, readmeContent, 'utf8');

		// Open the README file
		const readmeUri = vscode.Uri.file(readmePath);
		const readmeDoc = await vscode.workspace.openTextDocument(readmeUri);
		await vscode.window.showTextDocument(readmeDoc, { preview: false });

		output.appendLine(`📖 Created comprehensive README: ${contractFolderName}/README.md`);
		output.appendLine(`✅ Successfully created organized contract analysis with ${Object.keys(FOLDER_STRUCTURE).length} folders and ${Object.values(FOLDER_STRUCTURE).flat().length} files`);

	} catch (error) {
		output.appendLine(`❌ Error creating contract files: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}
