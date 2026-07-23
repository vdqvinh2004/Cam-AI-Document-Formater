<!--
Sync Impact Report
- Version change: template → 1.0.0
- Modified principles: template principle 1 → Native macOS Experience; template principle 2
	→ Privacy and User Control; template principle 3 → Reliable Document Handling;
	template principle 4 → Testable Quality; template principle 5 → Simplicity and Maintainability
- Added sections: Additional Constraints; Development Workflow
- Removed sections: none
- Templates requiring updates: ✅ none; existing Constitution Check and workflow sections
	are compatible with these principles
- Follow-up TODOs: confirm the original ratification date
-->
# Cam DocFormater Constitution

## Core Principles

### I. Native macOS Experience
The application MUST follow macOS conventions for windows, menus, keyboard navigation,
notifications, file dialogs, settings, and accessibility. User-facing behavior MUST remain
usable with supported system appearance settings and standard input methods. Native behavior
reduces learning cost and makes the application predictable for Mac users.

### II. Privacy and User Control
The application MUST process documents locally by default and MUST NOT transmit document
content or metadata without an explicit, understandable user action. It MUST request only the
macOS permissions required for the current feature, explain permission failures, and preserve
the user's original files unless the user explicitly chooses an overwrite or delete action.

### III. Reliable Document Handling
Document transformations MUST be deterministic for the same input and settings, MUST preserve
content that the feature does not intentionally change, and MUST fail without corrupting the
source or producing an ambiguous result. User-visible failures MUST provide a recoverable next
step, and long-running work MUST expose appropriate progress or completion state.

### IV. Testable Quality
Each user-facing feature MUST have an independently verifiable acceptance path. Pure logic MUST
be covered by automated tests, and file or UI workflows MUST have focused integration or manual
smoke checks where automation is impractical. A change MUST pass its relevant tests, build, and
static checks before release. Tests make document processing regressions visible before users
trust the result.

### V. Simplicity and Maintainability
The implementation MUST use the smallest design that satisfies the requirement and MUST follow
the platform and project conventions already in use. New dependencies, persistent state, and
abstractions require a concrete need. Features MUST include only the error handling, logging,
and documentation necessary to support their behavior and future maintenance.

## Additional Constraints

The application is a macOS desktop application. The supported macOS version, toolchain, and
distribution method MUST be stated in each implementation plan when they become known. The
application MUST avoid network services unless a feature explicitly requires them. Sensitive
data MUST use macOS-approved storage and access controls when persistence is required. The
interface MUST remain usable at the minimum supported window size and with accessibility
features enabled.

## Development Workflow

Every feature specification MUST identify a prioritized user journey, acceptance scenarios,
edge cases, and measurable success criteria. Every implementation plan MUST include a
Constitution Check covering the five principles and MUST record any justified violation.
Changes MUST be reviewed against their acceptance scenarios and MUST include focused automated
or manual verification appropriate to their risk. Release work MUST include a clean build and a
smoke check of the primary document workflow on the minimum supported macOS version when
available.

## Governance

This constitution is the governing standard for product and engineering decisions in the
repository. A proposal to amend it MUST state the motivation, affected principles, compatibility
impact, and required template or documentation changes. Amendments MUST update the version and
last-amended date in the same change.

Versioning follows semantic versioning: MAJOR for incompatible changes to principles or
governance, MINOR for new or materially expanded requirements, and PATCH for clarifications or
non-semantic corrections. The constitution MUST be reviewed during feature planning and release
readiness checks. Any exception MUST be documented in the plan's Complexity Tracking section
and approved by the project maintainer before implementation proceeds.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): initial adoption date not provided | **Last Amended**: 2026-07-23
