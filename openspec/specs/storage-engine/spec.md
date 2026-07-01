# Storage Engine Specification

## 1. Core Requirements

| ID | Requirement Description | Keyword |
| :--- | :--- | :--- |
| ST-1 | Render collapsible sidebar listing all saved stories with option to rename/delete/create. | MUST |
| ST-2 | Auto-save stories, memory settings, and Lorebook entries to browser localStorage on modification. | SHALL |
| ST-3 | Export/Import stories to/from a single JSON file preserving all settings and text. | MUST |
| ST-4 | Export story content as plain `.txt` file containing only the story text. | SHOULD |
| ST-5 | Display "Storage Used" progress bar calculating approximate percentage of 5MB localStorage limit. | SHALL |

## 2. Scenarios

### Scenario 1: Full Story JSON Import
- **Given** a valid story configuration JSON file
- **When** the user imports the file via the storage panel
- **Then** the system MUST parse the JSON, write to localStorage, and refresh the active story and sidebar

### Scenario 2: Storage Quota Computation
- **Given** localStorage contains 2.5MB of serialized data
- **When** the UI loads or saves a story
- **Then** the progress bar MUST display exactly 50% usage
