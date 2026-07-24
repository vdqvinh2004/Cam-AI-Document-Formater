import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createLocalStorageKeyStore } from './api-key-storage.js';
import { downloadBlob, formatSource, readSource, requestFormattingPlan, type BrowserResult, type BrowserSource } from './formatting.js';
import './styles/web.css';

const keyStore = createLocalStorageKeyStore();
const supported = ['.txt', '.md', '.markdown', '.docx', '.pdf'];

function WebApp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<BrowserSource | null>(null);
  const [key, setKey] = useState('');
  const [configured, setConfigured] = useState(keyStore.hasKey());
  const [disclosed, setDisclosed] = useState(false);
  const [message, setMessage] = useState('Choose one document to begin.');
  const [result, setResult] = useState<BrowserResult | null>(null);
  const [style, setStyle] = useState<'simple' | 'modern' | 'professional' | 'easy-to-read' | 'academic' | 'custom'>('modern');
  const [instructions, setInstructions] = useState('');

  useEffect(() => { document.title = source ? `${source.file.name} · Cam DocFormater Online` : 'Cam DocFormater Online'; }, [source]);

  const acceptFile = async (candidate: File | undefined) => {
    if (!candidate) return;
    try { setSource(await readSource(candidate)); setResult(null); setMessage('Document ready. Choose a style and accept the network disclosure.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'That document could not be read.'); }
  };

  const saveKey = () => {
    if (!key.trim()) return;
    keyStore.setKey(key.trim()); setKey(''); setConfigured(true); setMessage('Your Gemini key was replaced in this browser origin.');
  };

  const removeKey = () => {
    keyStore.removeKey(); setKey(''); setConfigured(false); setMessage('Your Gemini key was deleted from this browser.');
  };

  const start = async () => {
    if (!source || !configured || !disclosed) return;
    setMessage('Sending the disclosed formatting request...');
    try { const { plan, warnings } = await requestFormattingPlan(source, style, instructions, keyStore.getKey() ?? ''); const formatted = await formatSource(source, plan); setResult({ ...formatted, warnings: [...warnings, ...formatted.warnings] }); setMessage('Formatting plan applied. Content preserved and ready to download.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'The formatting pass failed.'); }
  };

  return <main className="web-shell">
    <header className="web-header"><a className="brand" href="/" aria-label="Cam DocFormater home"><img src="/paperloom-mark.svg" alt="" /> <span>Cam DocFormater</span></a><span className="product-tag">ONLINE WORKSPACE</span></header>
    <section className="web-intro"><p className="kicker">A browser-native document studio</p><h1>Give the page a better rhythm.</h1><p>Format presentation without rewriting the document. Uploads stay in this browser session until you export.</p></section>
    <section className="web-upload" aria-label="Upload document" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptFile(event.dataTransfer.files[0]); }}>
      <input ref={inputRef} type="file" accept={supported.join(',')} hidden onChange={(event) => void acceptFile(event.target.files?.[0])} />
      <p className="upload-label">01 / SOURCE</p><h2>{source?.file.name ?? 'Drop a document here'}</h2><p>One TXT, Markdown, DOCX, or PDF file.</p><button type="button" onClick={() => inputRef.current?.click()}>Choose file</button>
    </section>
    <section className="web-settings" aria-label="Browser settings"><p className="upload-label">02 / ACCESS</p><h2>{configured ? 'Gemini key ready' : 'Add a Gemini key'}</h2><p>{configured ? 'Stored only in this browser origin. It is never displayed.' : 'The browser product needs a key before it can contact Gemini.'}</p><label>API key<input type="password" value={key} onChange={(event) => setKey(event.target.value)} autoComplete="off" placeholder={configured ? 'Paste replacement key' : 'Paste key'} /></label><button type="button" onClick={saveKey} disabled={!key.trim()}>{configured ? 'Replace key' : 'Save key'}</button>{configured && <button type="button" onClick={removeKey}>Delete key</button>}</section>
    {source && <section className="web-settings" aria-label="Formatting controls"><p className="upload-label">03 / FORMAT</p><label>Style<select value={style} onChange={(event) => setStyle(event.target.value as typeof style)}><option value="simple">Simple</option><option value="modern">Modern</option><option value="professional">Professional</option><option value="easy-to-read">Easy to Read</option><option value="academic">Academic</option><option value="custom">Custom</option></select></label><label>Formatting notes<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={2000} placeholder="Presentation guidance only" /></label></section>}
    <section className="web-action"><label className="web-disclosure"><input type="checkbox" checked={disclosed} onChange={(event) => setDisclosed(event.target.checked)} /> I understand this formatting request sends document content to Gemini.</label><button type="button" onClick={() => void start()} disabled={!source || !configured || !disclosed}>Start formatting</button>{result && <button type="button" onClick={() => downloadBlob(result.blob, result.filename)}>Download formatted file</button>}<p role="status">{message}</p>{result && <p>Preservation check: passed. Source hash: {result.sourceHash.slice(0, 12)}...</p>}</section>
    <footer><span>Cam DocFormater Online</span><a href="/privacy">Privacy</a><span>Desktop app available for macOS</span></footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><WebApp /></StrictMode>);