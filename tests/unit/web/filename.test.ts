import { describe, expect, it } from 'vitest';
import { withFormattedSuffix } from '../../../src/web/lib/filename';

describe('export filename suffix', () => {
  it('inserts _cam_formatted before the last extension', () => {
    expect(withFormattedSuffix('report.docx')).toBe('report_cam_formatted.docx');
    expect(withFormattedSuffix('notes.txt')).toBe('notes_cam_formatted.txt');
    expect(withFormattedSuffix('archive.md')).toBe('archive_cam_formatted.md');
  });

  it('handles multi-dot names at the last extension', () => {
    expect(withFormattedSuffix('my.report.v2.pdf')).toBe('my.report.v2_cam_formatted.pdf');
  });

  it('handles names without an extension', () => {
    expect(withFormattedSuffix('README')).toBe('README_cam_formatted');
  });

  it('handles hidden files and extension-only names', () => {
    expect(withFormattedSuffix('.env')).toBe('.env_cam_formatted');
    expect(withFormattedSuffix('file.')).toBe('file_cam_formatted.');
  });
});