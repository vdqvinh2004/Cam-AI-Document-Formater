import { useState } from 'react';
import { useWorkflow } from '../state/workflow-context';
import { ROUTES } from '../types/route';
import { createLocalStorageKeyStore } from '../api-key-storage';

const keyStore = createLocalStorageKeyStore();

export function SettingsPage() {
  const { state, navigate, setApiKey, removeApiKey } = useWorkflow();
  const [key, setKey] = useState('');
  const [message, setMessage] = useState('');
  const [hasKey, setHasKey] = useState(() => keyStore.hasKey());

  const handleSave = () => {
    if (!key.trim()) return;
    setApiKey(key.trim());
    setHasKey(true);
    setKey('');
    setMessage('API key saved to this browser origin.');
  };

  const handleDelete = () => {
    removeApiKey();
    setHasKey(false);
    setMessage('API key removed from this browser.');
  };

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>Gemini API Key</h2>
        <p>
          Your API key is stored locally in this browser's local storage. It is never sent to our servers
          and is only used to authenticate requests to Google's Gemini API.
        </p>
        <div className="key-status">
          <span className={hasKey ? 'status-active' : 'status-inactive'}>
            {hasKey ? 'Key configured' : 'No key configured'}
          </span>
        </div>
        <label className="key-input-label">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={hasKey ? 'Enter new key to replace' : 'Paste your Gemini API key'}
            autoComplete="off"
          />
        </label>
        <div className="key-actions">
          <button onClick={handleSave} disabled={!key.trim()} className="btn-primary">
            {hasKey ? 'Replace Key' : 'Save Key'}
          </button>
          {hasKey && <button onClick={handleDelete} className="btn-danger">Delete Key</button>}
        </div>
        {message && <p className="settings-message">{message}</p>}
      </section>

      <section className="settings-section">
        <h2>Data & Privacy</h2>
        <ul>
          <li>Documents are processed entirely in your browser</li>
          <li>No document content is stored or transmitted to our servers</li>
          <li>Only document structure and formatting preferences are sent to Gemini API</li>
          <li>All session data is cleared when you close the tab</li>
        </ul>
        <button onClick={() => navigate(ROUTES['/privacy'])} className="btn-secondary">
          View Full Privacy Policy
        </button>
      </section>

      <section className="settings-section">
        <h2>About</h2>
        <p>Cam DocFormater — Browser-native document formatting studio</p>
        <p>Version 1.0.0</p>
      </section>

      <div className="settings-actions">
        <button onClick={() => navigate(ROUTES['/'])} className="btn-secondary">Back to Workspace</button>
      </div>
    </div>
  );
}