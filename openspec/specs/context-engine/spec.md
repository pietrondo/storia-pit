# Context Engine Specification

## 1. Core Requirements

| ID | Requirement Description | Keyword |
| :--- | :--- | :--- |
| CT-1 | Prepend Global Memory content directly to prompt system instructions. | MUST |
| CT-2 | Scan the last 2000 characters of story text for active case-insensitive exact word matches of Lorebook keys. | SHALL |
| CT-3 | 70% of context token budget MUST be reserved for story history; 30% for Global Memory and triggered Lorebook entries. | MUST |
| CT-4 | If context budget (30%) is exceeded, active Lorebook entries MUST be sorted by priority (descending). | MUST |
| CT-5 | Lower-priority Lorebook entries MUST be discarded first until the context fits the 30% limit. | SHALL |

## 2. Scenarios

### Scenario 1: Case-Insensitive Word Boundary Matching
- **Given** a Lorebook key "cat" and story text "A catastrophe occurs."
- **When** the engine scans the last 2000 characters
- **Then** the lorebook entry MUST NOT trigger (no exact word match)

### Scenario 2: Priority Sorting under Budget Constraint
- **Given** 30% context limit is 100 tokens, Memory is 40 tokens, Lore-A (Priority 10) is 40 tokens, Lore-B (Priority 5) is 30 tokens
- **When** the prompt is composed
- **Then** Global Memory and Lore-A MUST be included, and Lore-B MUST be dropped (since 40+40 <= 100, adding 30 exceeds budget)
