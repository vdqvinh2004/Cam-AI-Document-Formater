// Generates DOCX test fixtures with headings, lists, tables, images, hyperlinks,
// headers/footers, nested run formatting, unsupported embedded objects, malformed
// packages, and large documents.
// Run: node scripts/generate-docx-fixture.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'tests', 'fixtures', 'docx');

// A tiny 1x1 PNG (transparent) used as the embedded image.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

function contentTypesXml(extraOverrides = '', extraDefaults = '') {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  ${extraOverrides}
  ${extraDefaults}
</Types>`;
}

const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const sampleRichDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Sample Rich Document</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Introduction</w:t></w:r></w:p>
    <w:p><w:r><w:t>This paragraph contains a </w:t></w:r><w:hyperlink r:id="rIdLink1"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>hyperlink</w:t></w:r></w:hyperlink><w:r><w:t> to an external site.</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Bulleted List</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>First bullet</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Second bullet</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Data Table</w:t></w:r></w:p>
    <w:tbl>
      <w:tblPr><w:tblStyle w:val="TableGrid"/></w:tblPr>
      <w:tr><w:tc><w:p><w:r><w:t>Name</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Value</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:p><w:r><w:t>Alpha</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:p><w:r><w:t>Beta</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>2</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
    <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Embedded Image</w:t></w:r></w:p>
    <w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="100000" cy="100000"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:blipFill><a:blip r:embed="rIdImg1"/></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="100000" cy="100000"/></a:xfrm></pic:spPr></pic:pic></a:graphicData></a:graphic></w:drawing></w:r></w:p>
    <w:p><w:r><w:t>End of document.</w:t></w:r></w:p>
  </w:body>
</w:document>`;

const sampleRichRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdLink1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>
  <Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;

const sampleRichStyles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>
  <w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/></w:style>
  <w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/></w:style>
</w:styles>`;

const sampleRichNumbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

function headerFooterDocumentXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Header and Footer Document</w:t></w:r></w:p>
    <w:p><w:r><w:t>Body content between header and footer.</w:t></w:r></w:p>
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rIdHeader1"/>
      <w:footerReference w:type="default" r:id="rIdFooter1"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

const headerFooterRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdHeader1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`;

const header1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:r><w:t>Running Header Text</w:t></w:r></w:p>
</w:hdr>`;

const footer1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:r><w:t>Page footer content</w:t></w:r></w:p>
</w:ftr>`;

function nestedFormattingDocumentXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>Bold large run</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t> and italic run</w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t> and underlined run</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:vertAlign w:val="subscript"/></w:rPr><w:t>Subscript</w:t></w:r><w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:t>Superscript</w:t></w:r><w:r><w:rPr><w:smallCaps/></w:rPr><w:t>SMALLCAPS</w:t></w:r><w:r><w:rPr><w:color w:val="CC0000"/></w:rPr><w:t>Colored</w:t></w:r></w:p>
    <w:p><w:r><w:t>Plain paragraph after nested formatting.</w:t></w:r></w:p>
  </w:body>
</w:document>`;
}

function unsupportedObjectDocumentXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Document with an embedded object</w:t></w:r></w:p>
    <w:p><w:r><w:t>Text before the object.</w:t></w:r></w:p>
    <w:p>
      <w:r>
        <w:object w:dxaOrig="240" w:dyaOrig="240">
          <o:OLEObject Type="Embed" ProgID="Excel.Sheet.12" ShapeID="Shape1" r:id="rIdOle1"/>
        </w:object>
      </w:r>
    </w:p>
    <w:p><w:r><w:t>Text after the object.</w:t></w:r></w:p>
  </w:body>
</w:document>`;
}

const unsupportedObjectRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdOle1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject" Target="embeddings/oleObject1.bin"/>
</Relationships>`;

function largeDocumentXml(paragraphCount = 1600) {
  const body = [];
  for (let index = 0; index < paragraphCount; index += 1) {
    body.push(`<w:p><w:r><w:t>Paragraph number ${index} of the large document with some filler text to keep the preview bounded.</w:t></w:r></w:p>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body.join('')}</w:body>
</w:document>`;
}

async function writeZip(filename, parts, corrupt = false) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(parts)) {
    if (name === 'word/media/image1.png') zip.file(name, content);
    else zip.file(name, content);
  }
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  if (corrupt && buffer.length > 16) {
    // Tamper with a middle byte so the ZIP central directory no longer matches.
    buffer[Math.floor(buffer.length / 2)] ^= 0xff;
  }
  const outFile = join(outDir, filename);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, buffer);
  console.log(`Wrote ${outFile} (${buffer.length} bytes)`);
}

async function main() {
  await writeZip('sample-rich.docx', {
    '[Content_Types].xml': contentTypesXml(),
    '_rels/.rels': rootRelsXml,
    'word/document.xml': sampleRichDocumentXml,
    'word/_rels/document.xml.rels': sampleRichRels,
    'word/styles.xml': sampleRichStyles,
    'word/numbering.xml': sampleRichNumbering,
    'word/media/image1.png': PNG_1PX,
  });

  await writeZip('header-footer.docx', {
    '[Content_Types].xml': contentTypesXml(
      '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>',
      '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
    ),
    '_rels/.rels': rootRelsXml,
    'word/document.xml': headerFooterDocumentXml(),
    'word/_rels/document.xml.rels': headerFooterRels,
    'word/header1.xml': header1Xml,
    'word/footer1.xml': footer1Xml,
  });

  await writeZip('nested-formatting.docx', {
    '[Content_Types].xml': contentTypesXml(),
    '_rels/.rels': rootRelsXml,
    'word/document.xml': nestedFormattingDocumentXml(),
  });

  await writeZip('unsupported-object.docx', {
    '[Content_Types].xml': contentTypesXml(
      '<Default Extension="bin" ContentType="application/vnd.openxmlformats-officedocument.oleObject"/>'
    ),
    '_rels/.rels': rootRelsXml,
    'word/document.xml': unsupportedObjectDocumentXml(),
    'word/_rels/document.xml.rels': unsupportedObjectRels,
    'word/embeddings/oleObject1.bin': Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00, 0x00, 0x00]),
  });

  await writeZip('large-document.docx', {
    '[Content_Types].xml': contentTypesXml(),
    '_rels/.rels': rootRelsXml,
    'word/document.xml': largeDocumentXml(),
  });

  await writeZip('malformed-package.docx', {
    '[Content_Types].xml': contentTypesXml(),
    '_rels/.rels': rootRelsXml,
    'word/document.xml': '<?xml version="1.0"?><w:document><w:body><w:p><w:r><w:t>Broken',
  }, true);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});