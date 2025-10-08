# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Nothing yet.

## [1.2.0] - 2025-10-08

### Added

- Explorer context menu actions to add, remove, or ignore files and folders in the review scope.
- Explorer decorations flagging folders that contain tracked items or are ignored.
- Review Coverage navigation now opens files in the editor with a single click.

### Changed

- Distinguish removing entries from ignoring them so the review tab reflects scope updates immediately.

## [1.1.2] - 2025-10-07

### Changed

- Improve Review Coverage reveal behavior so the last selection is restored when the view becomes visible again without stealing focus.

## [1.1.1] - 2025-10-07

### Changed

- Auto-select the active editor inside the Review Coverage view and preserve selections after refreshes.
- Highlight fully covered files with subtle icons to speed up navigation.

## [1.1.0] - 2025-10-07

### Added

- Introduced the Review Coverage activity bar view with coverage summaries, tree navigation, and ignore/resync controls.
- Persist ignored files and folders while exposing `Ignore in Coverage`, `Include in Coverage`, `Reset Coverage Ignores`, and `Refresh Coverage` commands for flexible coverage management.

## [1.0.3] - 2025-09-10

### Changed

- Switched to a single explorer decoration provider with event-driven updates.
- Persist file-level review status changes and renames.
- Adjust line highlights in real time as documents change.
- Apply theme-aware explorer badge colors and provide lazy activation with default keybindings.

## [1.0.2] - 2023-12-06

### Added

- Added file markers to the explorer.

## [1.0.1] - 2023-12-04

### Fixed

- Fixed a bug where the extension would not work.

## [1.0.0] - 2023-12-01

### Added

- Initial release of Code Review Progress Tracker.

[unreleased]: https://github.com/narbonnais/Code-Review-Progress-Tracker/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/narbonnais/Code-Review-Progress-Tracker/compare/v1.1.2...v1.2.0
[1.1.2]: https://github.com/narbonnais/Code-Review-Progress-Tracker/commit/1e6e9cd
[1.1.1]: https://github.com/narbonnais/Code-Review-Progress-Tracker/commit/893aa1d
[1.1.0]: https://github.com/narbonnais/Code-Review-Progress-Tracker/commit/afcde58
[1.0.3]: https://github.com/narbonnais/Code-Review-Progress-Tracker/commit/39f3dd4
[1.0.2]: https://github.com/narbonnais/Code-Review-Progress-Tracker/commit/5613d03
[1.0.1]: https://github.com/narbonnais/Code-Review-Progress-Tracker/commit/78c8914
[1.0.0]: https://github.com/narbonnais/Code-Review-Progress-Tracker/commit/58e11de
