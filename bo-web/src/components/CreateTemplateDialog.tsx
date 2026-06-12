import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import DriveFolderUploadOutlinedIcon from '@mui/icons-material/DriveFolderUploadOutlined';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
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

type Mode = 'blank' | 'import';

export function CreateTemplateDialog({ open, defaultDir, onClose, notify, onCreated }: Props) {
    const [mode, setMode] = useState<Mode>('blank');
    const [name, setName] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [rootDir, setRootDir] = useState('');
    const [importFrom, setImportFrom] = useState('');
    const [layout, setLayout] = useState<'template' | '.'>('template');
    const [advanced, setAdvanced] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setMode('blank'); setName(''); setTitle(''); setDescription('');
            setRootDir(''); setImportFrom(''); setLayout('template'); setAdvanced(false);
            setBusy(false);
        }
    }, [open]);

    const submit = async () => {
        if (!name.trim()) return notify('A template name is required', 'error');
        if (mode === 'import' && !importFrom.trim()) return notify('Pick the folder to import', 'error');
        setBusy(true);
        try {
            const r = await api.createTemplate({
                name: name.trim(), title, description,
                output: 'merge',
                rootDir: rootDir || defaultDir,
                source: layout,
                importFrom: mode === 'import' ? importFrom.trim() : undefined,
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
            <DialogTitle>New template</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <ToggleButtonGroup
                        exclusive fullWidth size="small" value={mode}
                        onChange={(_, v) => v && setMode(v)}
                    >
                        <ToggleButton value="blank">
                            <AddBoxOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> Blank
                        </ToggleButton>
                        <ToggleButton value="import">
                            <DriveFolderUploadOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> Import a folder
                        </ToggleButton>
                    </ToggleButtonGroup>
                    <Typography variant="caption" color="text.secondary">
                        {mode === 'blank'
                            ? 'Start from a minimal sample payload and add files in the editor.'
                            : 'Copy an existing project as the template payload (node_modules / .git excluded). Its @@tokens@@ are detected automatically.'}
                    </Typography>

                    {mode === 'import' && (
                        <FolderField
                            label="Folder to import" value={importFrom} onChange={setImportFrom}
                            pickerTitle="Folder to import"
                        />
                    )}

                    <TextField
                        autoFocus required size="small" label="Name" placeholder="my-template"
                        value={name} onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) submit(); }}
                    />
                    <TextField size="small" label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <TextField size="small" label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />

                    <FolderField
                        label="Create in" value={rootDir} onChange={setRootDir}
                        placeholder={defaultDir}
                        helperText="Where the template folder is created — registered automatically."
                        pickerTitle="Create template in"
                    />

                    <Link component="button" type="button" variant="caption" underline="hover" sx={{ alignSelf: 'flex-start' }}
                        onClick={() => setAdvanced((a) => !a)}>
                        {advanced ? 'Hide advanced' : 'Advanced…'}
                    </Link>
                    <Collapse in={advanced}>
                        <TextField
                            select fullWidth size="small" label="Payload layout" value={layout}
                            onChange={(e) => setLayout(e.target.value as 'template' | '.')}
                            helperText={layout === 'template'
                                ? 'Files live in a template/ subfolder (manifest stays separate).'
                                : 'Files live at the template root; meta files are excluded from output unless opted in.'}
                        >
                            <MenuItem value="template">template/ subfolder</MenuItem>
                            <MenuItem value=".">flat — payload at template root</MenuItem>
                        </TextField>
                    </Collapse>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" disabled={busy || !name.trim() || (mode === 'import' && !importFrom.trim())} onClick={submit}>
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
