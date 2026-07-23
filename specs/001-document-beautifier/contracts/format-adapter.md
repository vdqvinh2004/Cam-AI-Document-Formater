# Format Adapter Contract: Document Beautifier

Each supported format implements the same main-process adapter boundary. Adapters receive an authorized ephemeral input and return a canonical representation; they never modify the source.

```ts
interface FormatAdapter {
  readonly format: 'txt' | 'markdown' | 'docx' | 'pdf';
  detect(input: ReadonlyBuffer, filename: string): DetectionResult;
  extractToIR(input: ReadonlyBuffer, options: ExtractOptions): Promise<CanonicalDocument>;
  applyFormattingPlan(document: CanonicalDocument, plan: FormattingPlan): CanonicalDocument;
  serialize(document: CanonicalDocument, options: SerializeOptions): Promise<Buffer>;
  validateRoundTrip(source: CanonicalDocument, output: ReadonlyBuffer): Promise<ValidationResult>;
}
```

## Adapter obligations

- Preserve immutable node IDs and content identity through extraction and serialization.
- Declare capabilities for text, images, tables, hyperlinks, structure, and unsupported constructs.
- Reject malformed, encrypted, password-protected, or unsupported input rather than partially processing it.
- Apply only presentation operations accepted by the formatting-plan schema.
- Re-extract serialized output before validation; do not validate only the in-memory transformed IR.
- Return `inconclusive` when a required preservation category cannot be checked reliably.
- Preserve the original extension and use the format-specific serializer.

## Format policy

- **TXT**: Preserve text, meaningful whitespace, encoding, and newline semantics. Rich presentation operations are limited to representable line layout.
- **Markdown**: Preserve AST order, raw links, reference definitions, code blocks, front matter, and unsupported syntax represented as opaque nodes.
- **DOCX**: Preserve OOXML relationships, media, tables, numbering, hyperlinks, and supported headers/footers; unsupported package parts must be retained or block export.
- **PDF**: Support only documented text/image/link/page-geometry capabilities. Encrypted, scan-only, form-heavy, annotation-heavy, or reading-order-ambiguous inputs block export unless the adapter can prove preservation.

## Validation categories

Every adapter reports checks for:

1. Ordered text and whitespace-sensitive content.
2. Asset count, identity/placement, and content equivalence.
3. Table count, dimensions, cell content, and merge topology.
4. Hyperlink targets, anchors, and internal bookmarks.
5. Supported structural relationships such as headings, lists, captions, footnotes, and page/document relationships.
6. Source hash and source-path immutability.

Presentation differences are allowed only in fields declared presentation-only by the adapter.
