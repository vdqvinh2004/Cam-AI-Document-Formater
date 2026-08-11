import { useCallback, useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        dragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary/60',
        disabled && 'cursor-not-allowed opacity-60'
      )}
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
      <UploadCloud className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-lg font-medium">
          {disabled ? 'File selected' : 'Drag & drop a document here, or click to browse'}
        </p>
        <p className="text-sm text-muted-foreground">Supported: TXT, Markdown, DOCX, PDF</p>
        {error && <p className="text-sm font-medium text-destructive" role="alert">{error}</p>}
      </div>
    </div>
  );
}