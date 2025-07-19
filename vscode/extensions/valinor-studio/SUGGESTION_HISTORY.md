# Suggestion History Feature

## Overview

The Suggestion History feature provides a comprehensive tracking system for all AI-generated content suggestions in Valinor Studio. It maintains a persistent history of accepted drafts, allowing users to browse past suggestions and reopen diff editors to review changes.

## Features

### 📋 Suggestion Tracking
- **Automatic Recording**: All AI-generated suggestions are automatically recorded when approved
- **Comprehensive Metadata**: Each suggestion includes section name, AI model used, timestamp, and file path
- **Original vs Generated Content**: Stores both original and suggested content for complete diff viewing

### 🗂️ History Management
- **Persistent Storage**: Suggestions are stored in `.valinor/suggestion-history.json`
- **Filtering Options**: Filter by section name, AI model, or date range
- **Search and Browse**: Scroll through all past suggestions with detailed information

### 🔄 Diff Editor Integration
- **One-Click Diff View**: Click any suggestion to reopen its diff editor
- **Side-by-Side Comparison**: View original vs generated content in VS Code's diff editor
- **Temporary File Management**: Automatic cleanup of temporary diff files

### 🎯 User Interface
- **Sleek WebView**: Modern interface matching Cursor's design aesthetic
- **Real-time Updates**: History updates automatically when new suggestions are approved
- **Action Buttons**: Delete suggestions and manage history entries

## Usage

### Accessing Suggestion History

1. **Via Command Palette**:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "Open Suggestion History"
   - Select the command

2. **Via Activity Bar**:
   - Click the Valinor Studio icon in the activity bar
   - Select "Suggestion History" from the sidebar

3. **Via Menu**:
   - Go to "Proposal → Suggestion History"

### Browsing Suggestions

The suggestion history displays each entry with:
- **Section Name**: The specific section that was generated
- **AI Model**: Which AI model was used (GPT-4, Claude-3, etc.)
- **Timestamp**: When the suggestion was created
- **File Path**: Which file the suggestion was for
- **Status**: Whether it was approved, rejected, or copied

### Filtering Suggestions

Use the filter controls at the top of the history view:
- **Section Filter**: Filter by section name (e.g., "Technical Approach")
- **Model Filter**: Filter by AI model (e.g., "GPT-4", "Claude-3")
- **Clear Filters**: Reset all filters to show all suggestions

### Reopening Diff Editors

1. **Click on any suggestion** in the history list
2. **Diff editor opens** showing original vs generated content
3. **Review changes** side-by-side
4. **Temporary files** are automatically cleaned up after 30 seconds

### Managing History

- **Delete Suggestions**: Click the delete button to remove entries from history
- **Export History**: All history is stored in JSON format for backup
- **Automatic Cleanup**: Temporary diff files are cleaned up automatically

## Technical Implementation

### Data Structure

Each suggestion record contains:
```typescript
interface SuggestionRecord {
    id: string;                    // Unique identifier
    section: string;              // Section name
    model: string;                // AI model used
    timestamp: Date;              // Creation timestamp
    originalContent: string;      // Original content
    suggestedContent: string;     // Generated content
    filePath: string;             // Target file path
    contractId?: string;          // Optional contract ID
}
```

### Storage Location

- **History File**: `.valinor/suggestion-history.json`
- **Temporary Files**: `.valinor/temp/` (auto-cleaned)
- **Backup**: History is automatically backed up with workspace

### Integration Points

The suggestion history integrates with:

1. **Section Generator**: Records suggestions when sections are generated via right-click
2. **Proposal Chat Generator**: Records suggestions when sections are approved via chat
3. **AI Analyzer**: Tracks all AI-generated content
4. **File Generator**: Associates suggestions with specific files

### WebView Implementation

The suggestion history uses a WebView with:
- **Modern UI**: Cursor-style design with proper theming
- **Real-time Updates**: Live updates when new suggestions are added
- **Interactive Elements**: Buttons for actions and filtering
- **Responsive Design**: Adapts to different screen sizes

## Configuration

### Environment Variables

No additional environment variables are required for suggestion history.

### Workspace Settings

The feature automatically creates:
- `.valinor/` directory for storage
- `suggestion-history.json` for persistent data
- `temp/` directory for temporary diff files

### File Permissions

Ensure the workspace has write permissions for:
- `.valinor/` directory
- `suggestion-history.json` file
- Temporary file creation

## Troubleshooting

### Common Issues

1. **History Not Loading**:
   - Check file permissions for `.valinor/` directory
   - Verify `suggestion-history.json` is not corrupted
   - Restart VS Code if needed

2. **Diff Editor Not Opening**:
   - Ensure temporary directory has write permissions
   - Check if temporary files are being cleaned up properly
   - Verify the suggestion record has valid content

3. **Suggestions Not Recording**:
   - Check that suggestion history provider is properly registered
   - Verify integration with section generator and proposal chat generator
   - Check console for error messages

### Debug Information

Enable debug logging by:
1. Opening VS Code Developer Tools (`Help → Toggle Developer Tools`)
2. Looking for "Valinor Studio" messages in the console
3. Checking the Output panel for "Valinor Studio" channel

### Reset History

To reset the suggestion history:
1. Close VS Code
2. Delete `.valinor/suggestion-history.json`
3. Restart VS Code
4. History will start fresh

## Future Enhancements

### Planned Features

1. **Advanced Filtering**:
   - Date range filtering
   - Contract-specific filtering
   - Status-based filtering

2. **Export Options**:
   - Export history to CSV/Excel
   - Backup and restore functionality
   - Cloud sync integration

3. **Enhanced Diff View**:
   - Inline diff viewing
   - Merge suggestions
   - Version comparison

4. **Analytics**:
   - Usage statistics
   - Model performance tracking
   - Section generation patterns

### API Integration

The suggestion history system is designed to support:
- REST API for external access
- Webhook notifications
- Third-party integrations
- Custom export formats

## Best Practices

### For Users

1. **Regular Review**: Periodically review suggestion history to identify patterns
2. **Model Selection**: Use different AI models to compare outputs
3. **Backup**: Keep regular backups of suggestion history
4. **Cleanup**: Delete outdated suggestions to maintain performance

### For Developers

1. **Error Handling**: Always handle file I/O errors gracefully
2. **Performance**: Implement pagination for large history files
3. **Security**: Validate all user inputs and file paths
4. **Testing**: Test with various file sizes and content types

## Support

For issues with the Suggestion History feature:
1. Check the troubleshooting section above
2. Review the console for error messages
3. Verify file permissions and workspace setup
4. Contact support with detailed error information

---

*This feature enhances the proposal generation workflow by providing complete visibility into AI-generated content and enabling efficient review and reuse of successful suggestions.*
