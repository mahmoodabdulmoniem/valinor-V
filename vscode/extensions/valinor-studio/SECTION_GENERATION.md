# Section Generation & Diff View

## Overview

The Section Generation feature allows you to right-click on section headers in `proposal.md` files to generate AI-powered content and view a side-by-side diff between the original stub and the generated content.

## How to Use

### 1. Right-Click on Section Headers

1. Open a `proposal.md` file in VS Code
2. Right-click on any section header (## Section Name)
3. Select "Generate [Section Name] Content" from the context menu

### 2. AI Content Generation

- The system will analyze the current section content
- Generate comprehensive, professional content using the selected AI model
- Show progress in a notification

### 3. View Diff

- A side-by-side diff view opens automatically
- Left panel shows the original stub content
- Right panel shows the AI-generated content
- Insertions and deletions are highlighted
- You can review and compare the content

### 4. Available Commands

#### Command Palette Commands
- `Valinor Studio: Generate Section Content` - Generate content for the current section
- `Valinor Studio: View Section Diff` - View diff between original and generated content

#### Context Menu
- Right-click on section headers in `proposal.md` files
- Select "Generate [Section Name] Content"

## Supported Section Types

The feature works with any markdown section headers:
- `## Executive Summary`
- `## Technical Approach`
- `## Management Plan`
- `## Past Performance`
- `## Cost Proposal`
- `## Risk Assessment`
- And any other section headers

## AI Model Integration

- Uses the currently selected AI model (GPT-4, Claude-3, etc.)
- Generates content specific to government contract proposals
- Maintains professional tone and formatting
- Includes relevant details and actionable content

## Diff View Features

### Side-by-Side Comparison
- Original content on the left
- Generated content on the right
- Clear visual indicators for changes

### Highlighting
- Green highlights for additions
- Red highlights for deletions
- Inline diff markers

### Navigation
- Scroll synchronization between panels
- Keyboard navigation support
- Preview mode for easy review

## Example Workflow

1. **Open proposal.md** with section stubs
2. **Right-click** on "## Executive Summary"
3. **Select** "Generate Executive Summary Content"
4. **Wait** for AI generation (progress shown)
5. **Review** the diff view
6. **Copy** desired content from generated version
7. **Paste** into your proposal document

## Tips for Best Results

### Section Headers
- Use clear, descriptive section names
- Follow standard proposal structure
- Include relevant keywords in section titles

### Content Generation
- The AI considers the current section content as context
- More detailed stubs lead to better generated content
- Review and edit generated content as needed

### Diff Review
- Focus on content quality and relevance
- Check for proper formatting and structure
- Ensure compliance with proposal requirements

## Technical Details

### File Requirements
- Must be named `proposal.md`
- Must contain markdown section headers (##)
- Must be in a VS Code workspace

### Temporary Files
- Temporary files are created for diff comparison
- Files are automatically cleaned up after 30 seconds
- No permanent changes to your original files

### AI Integration
- Uses the same AI models as the chat interface
- Supports all available models (GPT-4, Claude-3, etc.)
- Maintains consistent quality and style

## Troubleshooting

### No Context Menu Option
- Ensure the file is named `proposal.md`
- Check that you're right-clicking on a section header (##)
- Verify the extension is properly activated

### Generation Fails
- Check your AI model configuration
- Ensure you have valid API keys set up
- Try a different AI model

### Diff View Issues
- Temporary files may not be cleaned up properly
- Check workspace permissions
- Restart VS Code if needed

## Integration with Other Features

### Chat Interface
- Generated content can be discussed in the chat
- Ask follow-up questions about generated sections
- Get additional insights and recommendations

### File Generation
- Works alongside the contract analysis features
- Generated sections can be saved to organized folders
- Integrates with the overall proposal workflow

---

*This feature enhances your proposal writing workflow by providing AI-powered content generation with easy comparison and review capabilities.*
