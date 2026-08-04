# Cam DocFormater - Optimization Plan

## Executive Summary

This document outlines optimization opportunities across the web and native macOS codebases. The project has a well-structured architecture with clear separation of concerns, but there are several areas for improvement including code deduplication, performance optimization, type safety, and developer experience.

---

## 1. Code Deduplication (High Impact)

### 1.1 Shared Domain Models
**Problem**: Both web and native have nearly identical domain models:
- `DocumentFormat`, `Presentation`, `BlockNode`, `CanonicalDocument` (native) vs `BrowserSource`, `BrowserResult` (web)
- `FormattingProfile`, `FormattingPlan`, `FormattingOperation` (native) vs `BrowserFormattingPlan`, `BrowserFormattingOperation` (web)
- `ValidationResult`, `ValidationStatus` (both)

**Solution**: Create a shared `@cam-docformater/domain` package with TypeScript definitions that both platforms consume. Use `tsc --declaration` to generate `.d.ts` files for native Swift interop via code generation.

### 1.2 Formatting Logic
**Problem**: 
- Web: `formatting.ts` + `docx-formatting.ts` + `style-profiles.ts`
- Native: `Formatting.swift` + `DocumentAdapters.swift` + `MarkdownAdapter`

**Solution**: Extract core formatting logic to shared package. The web uses `docx-preview` library while native uses `PackageDocumentAdapter` - these can share the same operation application logic.

### 1.3 Comparison Engine
**Problem**: 
- Web: `comparison-engine.ts` (180 lines)
- Native: `ValidationComparator.swift` (50 lines) - simpler but less featured

**Solution**: Unify comparison logic in shared package with platform-specific renderers.

### 1.4 Instruction Policy
**Problem**: Both have instruction screening:
- Web: inline in `formatting.ts` (2000 char limit)
- Native: `InstructionPolicy.swift` (2000 char limit, blocked terms)

**Solution**: Shared validation utility.

---

## 2. Web App Optimizations

### 2.1 State Management (workflow-context.tsx)
**Issues**:
- Single massive reducer (200+ lines) handling all workflow state
- `runFormatting` callback recreates on every render due to `state` dependency
- `useMemo` for context value includes all callbacks - defeats memoization
- No selector pattern - components re-render on any state change

**Optimizations**:
```typescript
// Split into multiple contexts
const WorkflowStateContext = createContext<WorkflowState>(initialState);
const WorkflowActionsContext = createContext<WorkflowActions>(actions);

// Use useReducer with lazy initialization
const [state, dispatch] = useReducer(workflowReducer, undefined, init);

// Memoize individual action creators
const setSource = useCallback((source) => dispatch({ type: 'SET_SOURCE', payload: source }), []);
```

### 2.2 Component Performance
**Issues**:
- `PreviewPanel` re-renders on any workflow state change
- `FormatControls` re-renders on any state change
- No `React.memo` on leaf components
- `dangerouslySetInnerHTML` in `PreviewColumn` - XSS risk, no sanitization

**Optimizations**:
- Wrap `PreviewColumn` in `React.memo`
- Use `useWorkflowSelector` hook for granular subscriptions
- Sanitize HTML with DOMPurify before `dangerouslySetInnerHTML`

### 2.3 Bundle Size
**Current deps**: 
- `@radix-ui/*` (5 packages) - consider `@radix-ui/react-compose-refs` consolidation
- `docx-preview` (heavy) - lazy load only when DOCX preview needed
- `jszip` - only used for DOCX preview, lazy load

**Optimizations**:
```typescript
// Lazy load heavy deps
const DocxPreview = lazy(() => import('./preview/docx-preview-renderer'));
const JSZip = lazy(() => import('jszip'));
```

### 2.4 TypeScript Configuration
**Issues**:
- `tsconfig.web.json` has `noEmit: true` but `outDir` set - contradictory
- `skipLibCheck: true` hides type errors
- No `isolatedModules` for faster builds

---

## 3. Native macOS Optimizations

### 3.1 Architecture
**Strengths**: 
- Clean protocol-based dependency injection (`NativeServices`)
- Actor-based `JobCoordinator` for concurrency
- Proper error types with `LocalizedError`

**Issues**:
- `DocumentWorkflowViewModel` not shown - likely massive
- `PackageDocumentAdapter` base64 encodes entire DOCX/PDF - memory inefficient for large files
- No streaming for large document processing

### 3.2 Memory Efficiency
**Problem**: `PackageDocumentAdapter.extract()` loads entire file into base64 string in memory.

**Solution**: 
```swift
// Use file coordination for large files
func extract(data: Data) throws -> CanonicalDocument {
    // For large files, write to temp file and reference by URL
    // Only base64 encode small files (< 1MB)
}
```

### 3.3 Swift Concurrency
**Issues**:
- `JobCoordinator.start()` captures `client` and `apiKey` - potential retain cycles
- No structured concurrency for child tasks
- `Task.checkCancellation()` only at one point

---

## 4. Cross-Platform Consistency

### 4.1 API Contracts
**Web**: `format-adapter.ts` defines `FormatAdapter` interface
**Native**: `ServiceProtocols.swift` defines `DocumentAdapter` protocol

**Unify**: Single source of truth for adapter contracts.

### 4.2 Gemini Integration
**Web**: Direct `fetch` in `formatting.ts`
**Native**: `HTTPGeminiClient` in `NativeServices.swift`

**Unify**: Shared request/response types, retry logic, error handling.

### 4.3 Style Profiles
**Web**: `style-profiles.ts` with `resolveBrowserStyle()`
**Native**: `StyleName` enum in `Formatting.swift`

**Unify**: Shared style token definitions (JSON) consumed by both.

---

## 5. Developer Experience

### 5.1 Build System
**Issues**:
- Two separate build systems (Vite + SwiftPM)
- No shared linting/formatting config
- `eslint.config.js` uses `projectService` which slows down linting

**Optimizations**:
- Add `turbo` or `nx` for monorepo orchestration
- Shared `prettier` config
- ESLint flat config without `projectService`

### 5.2 Testing
**Web**: Vitest + Playwright (good coverage)
**Native**: XCTest (4 test files shown)

**Gaps**:
- No contract tests between web/native adapters
- No integration tests for full formatting pipeline
- No visual regression tests for previews

### 5.3 Documentation
**Good**: Comprehensive docs in `docs/` and `specs/`
**Missing**: 
- Architecture decision records (ADRs)
- API documentation (TypeDoc / DocC)
- Contribution guide

---

## 6. Security

### 6.1 Web
- `dangerouslySetInnerHTML` without sanitization (XSS risk)
- API key stored in localStorage (accessible to XSS)
- No CSP headers configured in Vite

### 6.2 Native
- Keychain storage (good)
- No certificate pinning for Gemini API
- File access via `FileAccess` protocol - good abstraction

---

## 7. Priority Matrix

| Optimization | Impact | Effort | Priority |
|--------------|--------|--------|----------|
| Shared domain package | High | Medium | P0 |
| Split workflow context | High | Low | P0 |
| Lazy load heavy deps | Medium | Low | P1 |
| Memoize components | Medium | Low | P1 |
| Sanitize HTML previews | High | Low | P0 |
| Unify Gemini client | Medium | Medium | P1 |
| Memory-efficient DOCX handling | Medium | Medium | P2 |
| Monorepo build system | Medium | High | P2 |
| Contract tests | Medium | Medium | P2 |
| ADR documentation | Low | Low | P3 |

---

## 8. Implementation Roadmap

### Phase 1 (Week 1-2): Critical Fixes
1. Add DOMPurify for HTML sanitization
2. Split `WorkflowContext` into State + Actions contexts
3. Add `React.memo` to leaf components
4. Fix TypeScript config contradictions

### Phase 2 (Week 3-4): Code Sharing
1. Create `@cam-docformater/domain` package
2. Extract shared types: `DocumentFormat`, `Presentation`, `FormattingPlan`, `ValidationResult`
3. Extract shared utilities: `InstructionPolicy`, `StyleProfiles`
4. Generate Swift types from TypeScript (or vice versa)

### Phase 3 (Week 5-6): Performance
1. Lazy load `docx-preview` and `jszip`
2. Implement `useWorkflowSelector` hook
3. Optimize native `PackageDocumentAdapter` for large files
4. Add bundle analysis to CI

### Phase 4 (Week 7-8): Infrastructure
1. Set up Turborepo/Nx
2. Shared ESLint/Prettier config
3. Contract tests for adapters
4. ADR template and initial records

---

## 9. Metrics to Track

- Bundle size (web): target < 200KB gzipped
- Time to interactive: target < 2s
- Memory usage (native): target < 100MB for 20MB DOCX
- TypeScript error count: 0
- Test coverage: > 80% for shared logic
- Build time: < 60s for full CI