# Accept/Reject Workflow Feature

## Overview

The Accept/Reject Workflow feature provides a seamless and intuitive way to review and apply AI-generated content changes in Valinor Studio. When AI generates content for proposal sections, users can review the changes in a diff editor with sleek Cursor-style Accept/Reject buttons in the toolbar.

## Features

### 🎯 Core Workflow
- **Diff Editor Integration**: Shows side-by-side comparison of original vs generated content
- **Sleek Cursor-Style Buttons**: Accept (✓) and Reject (✗) buttons in the diff editor toolbar
- **Modal Confirmation**: Prevents accidental acceptance/rejection with confirmation dialogs
- **Automatic Cleanup**: Temporary files and UI elements are cleaned up after actions

### 🔄 Workflow Steps

1. **Generate Content**: Right-click on a section header and select "Generate [Section] Content"
2. **AI Model Selection**: Choose from GPT-4, Claude-3, or Gemini-Pro
3. **Content Generation**: AI generates comprehensive content for the section
4. **Diff Review**: Side-by-side diff editor opens showing original vs generated content
5. **Accept/Reject Decision**: Use the sleek buttons in the toolbar to accept or reject changes
6. **Confirmation**: Confirm your decision in the modal dialog
7. **Apply Changes**: Accepted changes are applied to the proposal.md file
8. **History Tracking**: Accepted changes are automatically added to suggestion history

### 🎨 UI Design

#### Accept Button (✓)
- **Icon**: Checkmark symbol
- **Color**: Prominent background (green theme)
- **Position**: Right side of status bar, priority 100
- **Tooltip**: "Accept the generated changes"

#### Reject Button (✗)
- **Icon**: X symbol
- **Color**: Error background (red theme)
- **Position**: Right side of status bar, priority 99
- **Tooltip**: "Reject the generated changes"

### 📋 Session Management

#### DiffSession Interface
```typescript
interface DiffSession {
    originalUri: vscode.Uri;
    generatedUri: vscode.Uri;
    originalContent: string;
    generatedContent: string;
    sectionName: string;
    document: vscode.TextDocument;
    position: vscode.Position;
    model: string;
}
```

#### Session Lifecycle
1. **Creation**: Session created when diff editor opens
2. **Active State**: Session remains active while diff is open
3. **Action**: User accepts or rejects changes
4. **Cleanup**: Temporary files deleted, status bar items hidden
5. **History**: Accepted changes added to suggestion history

### 🔧 Technical Implementation

#### Commands Registered
- `valinorStudio.acceptSectionChanges`: Accepts the generated changes
- `valinorStudio.rejectSectionChanges`: Rejects the generated changes

#### Key Methods
- `showDiffWithAcceptReject()`: Creates diff editor with accept/reject buttons
- `addAcceptRejectButtons()`: Adds status bar items for accept/reject actions
- `acceptSectionChanges()`: Handles acceptance workflow
- `rejectSectionChanges()`: Handles rejection workflow
- `cleanupSession()`: Cleans up resources after action

#### File Management
- **Temporary Files**: Created with unique session IDs
- **Auto Cleanup**: Files deleted after 5 minutes if not acted upon
- **Workspace Integration**: Files created in workspace root with `.` prefix

### 🎯 User Experience

#### Accept Workflow
1. Click the ✓ Accept button in the diff editor toolbar
2. Confirm acceptance in the modal dialog
3. Changes are applied to the original proposal.md file
4. Success message displayed: "✅ Changes accepted for [Section Name]"
5. Diff editor closes automatically
6. Changes added to suggestion history

#### Reject Workflow
1. Click the ✗ Reject button in the diff editor toolbar
2. Confirm rejection in the modal dialog
3. Changes are discarded
4. Rejection message displayed: "❌ Changes rejected for [Section Name]"
5. Diff editor closes automatically
6. No changes made to the original file

### 🔒 Error Handling

#### Session Expiration
- Sessions expire after 5 minutes of inactivity
- Temporary files are automatically cleaned up
- User receives error message if trying to act on expired session

#### File System Errors
- Graceful handling of file read/write errors
- User-friendly error messages
- Automatic cleanup attempts

#### Document State
- Validates document state before applying changes
- Handles cases where document has been modified externally
- Preserves user's work in case of conflicts

### 📊 Integration Points

#### Suggestion History
- Accepted changes automatically added to suggestion history
- Includes metadata: section name, AI model, timestamp, file path
- Enables future review and comparison of accepted suggestions

#### AI Models
- Supports multiple AI models: GPT-4, Claude-3, Gemini-Pro
- Model selection integrated into the workflow
- Model information stored with suggestion history

#### Context Menu
- Right-click on section headers to generate content
- Seamless integration with existing proposal.md structure
- Supports all markdown header levels (## and above)

### 🎨 Visual Design

#### Status Bar Integration
- Accept/Reject buttons appear in the status bar when diff is active
- Buttons are positioned on the right side for easy access
- Color-coded for quick visual identification

#### Modal Dialogs
- Clean, modern confirmation dialogs
- Clear action buttons (Accept/Reject vs Cancel)
- Descriptive messages with section names

#### Success/Error Messages
- Consistent emoji usage (✅ for success, ❌ for rejection)
- Clear, actionable error messages
- Non-intrusive notification system

### 🔧 Configuration

#### Timeout Settings
- Default session timeout: 5 minutes
- Configurable cleanup intervals
- Automatic resource management

#### File Naming
- Temporary files use session ID for uniqueness
- Hidden files (prefixed with `.`) to avoid workspace clutter
- Automatic cleanup prevents file system pollution

### 📈 Future Enhancements

#### Potential Improvements
- Keyboard shortcuts for accept/reject actions
- Batch accept/reject for multiple sections
- Customizable timeout periods
- Enhanced diff visualization options
- Integration with version control systems

#### Advanced Features
- Partial acceptance of changes (hunk-level)
- Custom accept/reject rules
- Integration with external review systems
- Advanced diff algorithms for better comparison

## Usage Examples

### Basic Workflow
1. Open `proposal.md` in VS Code
2. Right-click on a section header (e.g., "## Technical Approach")
3. Select "Generate Technical Approach Content"
4. Choose AI model (GPT-4, Claude-3, or Gemini-Pro)
5. Review generated content in diff editor
6. Click ✓ Accept or ✗ Reject button
7. Confirm action in modal dialog
8. Changes applied or discarded accordingly

### Advanced Usage
- Generate multiple sections in sequence
- Compare different AI models for the same section
- Use suggestion history to review past accepted changes
- Integrate with business profile enrichment for personalized content

## Troubleshooting

### Common Issues
- **Session expired**: Regenerate the section content
- **File not found**: Ensure you're working in a valid workspace
- **Permission errors**: Check file write permissions
- **AI generation failed**: Try a different AI model or regenerate

### Debug Information
- Check the Output panel for detailed error messages
- Review the suggestion history for successful generations
- Verify workspace folder structure and permissions
- Ensure all required dependencies are installed
