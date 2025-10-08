# Code Review Progress Tracker

## Description

Code Review Progress Tracker is a Visual Studio Code extension designed to help developers track their progress while reviewing code. It allows users to mark specific lines or sections of code in different review states like 'OK', 'Warning', and 'Danger'.

![preview](./preview.png)

## Features

- **Mark Sections**: Easily mark sections of code as reviewed with different statuses (OK, Warning, Danger).
- **Clear Marks**: Remove review marks from a section or clear all marks in a file.
- **Persistent State**: Review marks are saved and restored across VS Code sessions.
- **Explorer Badges**: Add visual badges (✓, ?, !, ⊘) to files in the explorer.
- **Scope Controls**: Right-click files or folders to add, remove, or ignore them in the review scope.
- **Coverage Navigation**: Click any file in the Review Coverage tree to open it instantly in the editor.
- **Live Updates**: Line highlights adjust when you edit the document.

## Installation

To install the Code Review Progress Tracker, download a [release](https://github.com/narbonnais/Code-Review-Progress-Tracker/releases) and follow these steps:

1. Open Visual Studio Code.
2. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
3. Type `Extensions: Install from VSIX...` and press Enter.
4. Select the downloaded VSIX file and press Enter.

## Usage

After installation, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run any of the commands below, or bind them to shortcuts.

### Range review commands

- `code-review-progress-tracker.reviewedOk`: Highlight selection as OK.
- `code-review-progress-tracker.reviewedWarning`: Highlight selection with a warning badge.
- `code-review-progress-tracker.reviewedDanger`: Highlight selection as requiring changes.
- `code-review-progress-tracker.reviewedClear`: Clear highlights from the selection.
- `code-review-progress-tracker.reviewedClearAll`: Clear all highlights in the active file.

### File badge commands

- `code-review-progress-tracker.reviewedFileOk`: Add a ✓ badge to the active file.
- `code-review-progress-tracker.reviewedFileWarning`: Add a ? badge to the active file.
- `code-review-progress-tracker.reviewedFileDanger`: Add a ! badge to the active file.
- `code-review-progress-tracker.reviewedFileOutOfScope`: Mark the active file as out of scope (⊘).
- `code-review-progress-tracker.reviewedFileClear`: Remove any badge from the active file.

### Review scope commands

- `code-review-progress-tracker.scope.add`: Add selected files or folders to the review scope (also unignores them).
- `code-review-progress-tracker.scope.remove`: Remove selected files or folders from the review scope entirely.
- `code-review-progress-tracker.scope.ignore`: Leave items in scope but ignore them in coverage totals.

### Coverage view commands

- `code-review-progress-tracker.coverage.include`: Re-include an ignored entry.
- `code-review-progress-tracker.coverage.ignore`: Ignore the selected entry in totals.
- `code-review-progress-tracker.coverage.clearIgnores`: Reset all ignored entries.
- `code-review-progress-tracker.coverage.refresh`: Recompute the coverage tree.

Right-click files or folders in the explorer or Review Coverage tree to access the scope commands. Clicking a file in the Review Coverage tree automatically opens it in the editor so you can continue reviewing without leaving the view.

### Default Keybindings

These can be changed in Keyboard Shortcuts, but the extension ships with:

- `Mark Reviewed (OK)`: `Ctrl+Alt+1` (`Cmd+Option+1` on on macOS)
- `Mark Reviewed (Warning)`: `Ctrl+Alt+2` (`Cmd+Option+2` on macOS)
- `Mark Reviewed (Danger)`: `Ctrl+Alt+3` (`Cmd+Option+3` on macOS)
- `Clear Review Mark`: `Ctrl+Alt+0` (`Cmd+Option+0` on macOS)
- `Clear All Review Marks`: `Ctrl+Alt+Backspace` (`Cmd+Option+Backspace` on macOS)
- File badges OK/Warning/Danger/Out of scope: `Ctrl+Alt+Shift+1/2/3/4` (use `Cmd` on macOS)
- Clear File Badge: `Ctrl+Alt+Shift+0` (use `Cmd` on macOS)

## Requirements

- Visual Studio Code 1.84.0 or higher.

## Extension Settings

There are no extension settings at this time.

## Known Issues

- If you previously used a version before 1.0.3, file review statuses are now keyed by full URI instead of path; existing persisted badges may not carry over automatically.
- If you find any bugs or have a feature request, please open an issue.

## Release Notes

See [CHANGELOG.md](./CHANGELOG.md) for the complete release history.

## Contributing

Contributions are always welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request.
