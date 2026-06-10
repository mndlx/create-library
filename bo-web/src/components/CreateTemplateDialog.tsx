import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';
import { api, type OutputMode } from '../api';

interface Props {
    open: boolean;
    defaultDir: string;
    onClose: () => void;
    notify: (msg: string, sev?: 'success' | 'error' | 'info') => void;
    onCreated: (name: string) => void;
}

export function CreateTemplateDialog({ open, defaultDir, onClose, notify, onCreated }: Props) {
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [output, setOutput] = useState<OutputMode>('new');
    const [rootDir, setRootDir] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setName(''); setTitle(''); setDescription(''); setOutput('new'); setRootDir('');
            setBusy(false);
        }
    }, [open]);

    const submit = async () => {
        if (!name.trim()) return notify('A template name is required', 'error');
        setBusy(true);
        try {
            const r = await api.createTemplate({ name: name.trim(), title, description, output, rootDir: rootDir || defaultDir });
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
            <DialogTitle>New template</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        autoFocus required size="small" label="Name" placeholder="my-template"
                        value={name} onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) submit(); }}
                        helperText="Folder name + manifest name (e.g. my-template)."
                    />
                    <TextField size="small" label="Title" placeholder="My template" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <TextField size="small" label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    <TextField select size="small" label="Output mode" value={output} onChange={(e) => setOutput(e.target.value as OutputMode)}>
                        <MenuItem value="new">new — creates a folder</MenuItem>
                        <MenuItem value="merge">merge — into an existing project</MenuItem>
                    </TextField>
                    <TextField
                        size="small" label="Create in directory" placeholder={defaultDir}
                        value={rootDir} onChange={(e) => setRootDir(e.target.value)}
                        helperText="Where the template folder is created. Auto-registered so it appears in the list."
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" disabled={busy || !name.trim()} onClick={submit}>Create</Button>
            </DialogActions>
        </Dialog>
    );
}
