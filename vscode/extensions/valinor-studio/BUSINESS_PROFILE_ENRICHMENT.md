# Business Profile Enrichment

## Overview

The Business Profile Enrichment feature automatically injects your firm's comprehensive profile into proposals, adding depth and polish with minimal effort. This feature integrates with your business profile data to create professional, detailed company sections that enhance your proposal's credibility and completeness.

## Prerequisites

### Business Profile Setup
Before using this feature, ensure you have completed your Business Profile in Settings with:
- **Company Name**: Your official business name
- **Core Competencies**: Key areas of expertise and capabilities
- **Past Performance Highlights**: Notable achievements and project successes
- **Key Differentiators**: What sets your company apart
- **NAICS Codes**: Industry classifications relevant to your business
- **CAGE Code**: Commercial and Government Entity code (if applicable)
- **Compliance Standards**: Certifications and compliance achievements
- **Contractor History**: Government contracts, certifications, and programs

## How to Use

### Step 1: Open Proposal Document
1. Open your `proposal.md` file in VS Code
2. Place your cursor at the top of the document, beneath the title

### Step 2: Access the Command
You can access the feature in three ways:
- **Command Palette**: Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and type "Proposal: Insert Company Profile"
- **Editor Title Bar**: Click the "Insert Company Profile" button in the editor title bar
- **Command Palette**: Navigate to "Proposal → Insert Company Profile"

### Step 3: Review and Confirm
1. A modal window will appear showing your business profile data
2. Review all fields and make any necessary adjustments:
   - **Company Information**: Company name and CAGE code
   - **Core Competencies**: Add, edit, or remove competencies
   - **Past Performance**: Modify performance highlights
   - **Key Differentiators**: Update differentiators
   - **NAICS Codes**: Add or remove industry codes
   - **Compliance Standards**: Update certifications
   - **Contractor History**: Modify certifications and programs

3. Click "Insert Company Profile" to proceed

### Step 4: Automatic Insertion
- The system will automatically insert a comprehensive "## Company Profile" section
- Content is positioned after the title and before other sections
- Professional formatting with proper markdown structure

## Generated Content Structure

The inserted company profile includes:

### Company Overview
- Company name and introduction
- CAGE code (if provided)
- Professional positioning statement

### Core Competencies
- Bulleted list of key capabilities
- Bold formatting for emphasis
- Professional language and structure

### Past Performance Highlights
- Detailed achievements and successes
- Quantified results where applicable
- Government contract experience

### Key Differentiators
- Unique selling propositions
- Competitive advantages
- Specialized capabilities

### NAICS Codes & Classifications
- Industry standard classifications
- Relevant business categories
- Government contracting codes

### Compliance Standards & Certifications
- ISO certifications
- Security clearances
- Quality management systems
- Industry-specific certifications

### Contractor History & Certifications
- GSA schedules
- Small business certifications
- Special programs (8(a), VOSB, etc.)
- Government contract history

## Integration with Business Profile System

### Data Flow Architecture
```
UI Component (account-profile-form.tsx)
    ↓
Client-Side Hook (use-business-profile.ts)
    ↓
API Route (app/api/business-profiles/user/[userId]/route.ts)
    ↓
Server Action (business-profile-actions.ts)
    ↓
DynamoDB Table (BusinessProfiles)
```

### Database Tables
- `DYNAMODB_BUSINESS_PROFILES_TABLE=BusinessProfiles`
- `DYNAMODB_USER_SETTINGS_TABLE=UserSettings`
- `DYNAMODB_USER_PREFERENCES_TABLE=UserPreferences`

### Profile Data Structure
```typescript
interface BusinessProfile {
  userId: string;
  companyName: string;
  coreCompetencies: string[];
  pastPerformance: string[];
  differentiators: string[];
  naicsCodes: string[];
  cageCode?: string;
  complianceStandards: string[];
  contractorHistory: string[];
  createdAt: string;
  updatedAt: string;
}
```

## Features

### Smart Content Positioning
- Automatically detects document structure
- Inserts after title, before other sections
- Maintains proper document flow

### Interactive Confirmation Modal
- Review all profile data before insertion
- Add, edit, or remove items dynamically
- Real-time validation and formatting

### Professional Formatting
- Consistent markdown structure
- Proper heading hierarchy
- Clean, readable formatting

### Data Validation
- Ensures required fields are present
- Validates NAICS code formats
- Checks for duplicate entries

## Best Practices

### Profile Data Management
1. **Keep Information Current**: Regularly update your business profile
2. **Be Specific**: Use concrete examples and quantifiable achievements
3. **Focus on Relevance**: Include competencies and experience relevant to target contracts
4. **Maintain Accuracy**: Ensure all certifications and codes are current

### Proposal Integration
1. **Review Generated Content**: Always review the inserted content for accuracy
2. **Customize as Needed**: Modify the generated content to match specific RFP requirements
3. **Maintain Consistency**: Ensure the profile aligns with other proposal sections
4. **Update Regularly**: Refresh the profile as your business evolves

### Content Optimization
1. **Use Action Verbs**: Start bullet points with strong action verbs
2. **Quantify Achievements**: Include specific numbers, percentages, and dollar amounts
3. **Highlight Government Experience**: Emphasize relevant government contract work
4. **Focus on Benefits**: Explain how your capabilities benefit the client

## Troubleshooting

### No Profile Data Available
- **Cause**: Business profile not completed in Settings
- **Solution**: Complete your business profile setup first

### Command Not Available
- **Cause**: Not in a `proposal.md` file
- **Solution**: Ensure you're working in a file named `proposal.md`

### Insertion Fails
- **Cause**: Document permissions or structure issues
- **Solution**: Check file permissions and ensure proper markdown structure

### Modal Not Displaying
- **Cause**: Webview rendering issues
- **Solution**: Restart VS Code and try again

## Advanced Features

### Custom Templates
- Support for custom profile templates
- Industry-specific formatting options
- Configurable content sections

### Batch Processing
- Insert profiles into multiple proposals
- Bulk profile updates
- Template management

### Integration with AI
- AI-powered content suggestions
- Automatic competency matching
- Smart content optimization

## Security and Privacy

### Data Protection
- Profile data is stored securely in DynamoDB
- Access controlled by user authentication
- No sensitive data transmitted unnecessarily

### Privacy Controls
- User controls what information is included
- Option to exclude sensitive details
- Configurable privacy settings

## Future Enhancements

### Planned Features
- **Dynamic Content**: AI-powered content customization based on RFP requirements
- **Template Library**: Pre-built profile templates for different industries
- **Analytics**: Track profile usage and effectiveness
- **Collaboration**: Team profile management and sharing

### Integration Roadmap
- **CRM Integration**: Connect with customer relationship management systems
- **Contract Database**: Link with past performance databases
- **Certification Tracking**: Automatic certification renewal reminders
- **Market Intelligence**: Industry trend analysis and recommendations

---

*This feature streamlines your proposal development process by automatically incorporating your business profile data, ensuring consistency and professionalism across all your proposals.*
