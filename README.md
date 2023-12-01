# Code Review Progress Tracker

## Description

Code Review Progress Tracker is a Visual Studio Code extension designed to help developers track their progress while reviewing code. It allows users to mark specific lines or sections of code in different review states like 'OK', 'Warning', and 'Danger'.

![preview](./preview.png)

## Features

- **Mark Sections**: Easily mark sections of code as reviewed with different statuses (OK, Warning, Danger).
- **Clear Marks**: Remove review marks from a section or clear all marks in a file.
- **Persistent State**: Review marks are saved and restored across VS Code sessions.

## Installation

To install the Code Review Progress Tracker, follow these steps:

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window.
3. Search for "Code Review Progress Tracker".
4. Click the Install button.

## Usage

After installation, you can use the following commands:

- `code-review-progress-tracker.reviewedOk`: Mark a section as OK.
- `code-review-progress-tracker.reviewedWarning`: Mark a section with a warning.
- `code-review-progress-tracker.reviewedDanger`: Mark a section as dangerous.
- `code-review-progress-tracker.reviewedClear`: Clear review mark from a section.
- `code-review-progress-tracker.reviewedClearAll`: Clear all review marks from the current file.

To use these commands, select the code you want to mark, open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`), and type the command.

## Requirements

- Visual Studio Code 1.50.0 or higher.

## Extension Settings

There are no extension settings at this time.

## Known Issues

No known issues so far. If you find any bugs or have a feature request, please open an issue.

## Release Notes

### 1.0.0

Initial release of Code Review Progress Tracker.

## Contributing

Contributions are always welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request.
