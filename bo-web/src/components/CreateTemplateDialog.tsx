import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { FolderField } from './FolderPicker';

interface Props {
    open: boolean;
    defaultDir: string;
    onClose: () => void;
    notify: (msg: string, sev?: 'success' | 'error' | 'info') => void;
    onCreated: (name: string) => void;
}

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

export function CreateTemplateDialog({ open, defaultDir, onClose, notify, onCreated }: Props) {
    const [name, setName] = useState('');
    const [shortName, setShortName] = useState('');
    const [sourceName, setSourceName] = useState('MyProject');
    const [author, setAuthor] = useState('');
    const [rootDir, setRootDir] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) { setName(''); setShortName(''); setSourceName('MyProject'); setAuthor(''); setRootDir(''); setBusy(false); }
    }, [open]);

    const submit = async () => {
        if (!name.trim()) return notify('A template name is required', 'error');
        setBusy(true);
        try {
            const r = await api.createTemplate({
                name: name.trim(),
                shortName: (shortName.trim() || slug(name)) || undefined,
                author: author.trim() || undefined,
                sourceName: sourceName.trim() || undefined,
                rootDir: rootDir || defaultDir,
            });
            notify(`Template created at ${r.dir}`, 'success');
            onCreated(r.name);
            onClose();
        } catch (e) {
            notify((e as Error).message, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>New dotnet template</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Scaffolds a <code>.template.config/template.json</code> skeleton with one sample parameter.
                        Add files and symbols afterwards; generation runs <code>dotnet new</code>.
                    </Typography>
                    <TextField autoFocus required size="small" label="Display name" placeholder="My Library"
                        value={name} onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) submit(); }} />
                    <TextField size="small" label="Short name (dotnet new <shortName>)" placeholder={slug(name) || 'my-library'}
                        value={shortName} onChange={(e) => setShortName(e.target.value)} />
                    <TextField size="small" label="Source name (renamed by -n at generation)" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
                    <TextField size="small" label="Author (optional)" value={author} onChange={(e) => setAuthor(e.target.value)} />
                    <FolderField label="Create in" value={rootDir} onChange={setRootDir} placeholder={defaultDir}
                        helperText="Where the template folder is created — registered automatically." pickerTitle="Create template in" compact={false} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" disabled={busy || !name.trim()} onClick={submit}>Create</Button>
            </DialogActions>
        </Dialog>
    );
}
