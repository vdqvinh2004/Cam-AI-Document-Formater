import { useState } from 'react';
import { useWorkflow } from '../state/workflow-context';
import { useRouter } from '../router';
import { ROUTES } from '../types/route';
import { createLocalStorageKeyStore } from '../api-key-storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { useTheme } from '@/providers/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

const keyStore = createLocalStorageKeyStore();

export function SettingsPage() {
  const { setApiKey, removeApiKey } = useWorkflow();
  const { navigate } = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(() => keyStore.hasKey());

  const handleSave = () => {
    if (!key.trim()) return;
    setApiKey(key.trim());
    setHasKey(true);
    setKey('');
    toast({ title: 'API key saved to this browser origin.' });
  };

  const handleDelete = () => {
    removeApiKey();
    setHasKey(false);
    toast({ title: 'API key removed from this browser.' });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Gemini API Key</CardTitle>
          <CardDescription>
            Your API key is stored locally in this browser's local storage. It is never sent to our servers
            and is only used to authenticate requests to Google's Gemini API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={hasKey ? 'default' : 'secondary'}>
              {hasKey ? 'Key configured' : 'No key configured'}
            </Badge>
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={hasKey ? 'Enter new key to replace' : 'Paste your Gemini API key'}
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!key.trim()}>
              {hasKey ? 'Replace Key' : 'Save Key'}
            </Button>
            {hasKey && <Button variant="destructive" onClick={handleDelete}>Delete Key</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">Choose light, dark, or follow system</p>
            </div>
            <Button variant="outline" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Documents are processed entirely in your browser</li>
            <li>No document content is stored or transmitted to our servers</li>
            <li>Only document structure and formatting preferences are sent to Gemini API</li>
            <li>All session data is cleared when you close the tab</li>
          </ul>
          <Button variant="outline" onClick={() => navigate(ROUTES['/privacy'])}>View Full Privacy Policy</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cam DocFormater — Browser-native document formatting studio</p>
          <p className="text-sm text-muted-foreground">Version 1.0.0</p>
        </CardContent>
      </Card>

      <div>
        <Button variant="secondary" onClick={() => navigate(ROUTES['/'])}>Back to Workspace</Button>
      </div>
    </div>
  );
}