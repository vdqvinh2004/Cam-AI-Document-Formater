import { useCallback, useRef, useState } from 'react';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  onFileError?: (message: string) => void;
  disabled?: boolean;
  accept?: string;
}

export function FileDropzone({ onFileSelect, onFileError, disabled = false, accept = '.txt,.md,.markdown,.docx,.pdf' }: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragActive(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const selectFile = useCallback((file: File) => {
    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!accept.split(',').map((item) => item.trim().toLowerCase()).includes(extension)) {
      const message = 'File type not supported. Choose a TXT, Markdown, DOCX, or PDF file.';
      setError(message);
      onFileError?.(message);
      return;
    }
    setError('');
    onFileSelect(file);
  }, [accept, onFileError, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    
    const file = e.dataTransfer.files[0];
    if (file) selectFile(file);
  }, [disabled, selectFile]);

  const handleClick = useCallback(() => {
    if (!disabled) fileInputRef.current?.click();
  }, [disabled]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
    e.target.value = '';
  }, [selectFile]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div
      className={`file-dropzone ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={handleDrag}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="File drop zone"
      aria-disabled={disabled}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
        aria-hidden="true"
      />
      <div className="dropzone-content">
        <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="dropzone-text">
          {disabled ? 'File selected' : 'Drag & drop a document here, or click to browse'}
        </p>
        <p className="dropzone-hint">Supported: TXT, Markdown, DOCX, PDF</p>
        {error && <p className="dropzone-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}