import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import { useDialogs } from './dialogs';

interface BrowseResult {
    path: string;
    parent: string | null;
    dirs: string[];
    roots: boolean;
}

const browse = async (p: string): Promise<BrowseResult> => {
    const r = await fetch('/api/fs/dirs?' + new URLSearchParams({ path: p }));
    const data = await r.json();
    if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);
    return data as BrowseResult;
};

interface PickerProps {
    open: boolean;
    title?: string;
    initialPath?: string;
    onClose: () => void;
    onSelect: (path: string) => void;
}

/** Navigable directory picker backed by the local server. */
export function FolderPickerDialog({ open, title = 'Select folder', initialPath, onClose, onSelect }: PickerProps) {
    const { prompt } = useDialogs();
    const [state, setState] = useState<BrowseResult>({ path: '', parent: null, dirs: [], roots: true });
    const [error, setError] = useState('');

    const go = useCallback(async (p: string) => {
        try {
            setState(await browse(p));
            setError('');
        } catch (e) {
            setError((e as Error).message);
        }
    }, []);

    useEffect(() => {
        if (open) go(initialPath || '');
    }, [open, initialPath, go]);

    // Forward slash works on every platform (path.resolve normalizes server-side).
    const join = (base: string, name: string) => (base.endsWith('\\') || base.endsWith('/') ? base + name : `${base}/${name}`);
    const enter = (name: string) => go(state.roots ? name : join(state.path, name));

    const newFolder = async () => {
        if (state.roots) return;
        const name = await prompt({ title: 'New folder', label: 'Name', confirmText: 'Create' });
        if (!name) return;
        try {
            const r = await fetch('/api/fs/mkdir', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: join(state.path, name) }),
            });
            const data = await r.json();
            if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`);
            await go(data.dir);
        } catch (e) {
            setError((e as Error).message);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent sx={{ pb: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Tooltip title="Up">
                        <span>
                            <IconButton size="small" disabled={state.parent === null && !state.roots ? false : !state.parent && !state.path}
                                onClick={() => go(state.parent ?? '')}>
                                <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Typography variant="body2" noWrap sx={{ flex: 1, fontFamily: 'ui-monospace, monospace', fontSize: 12 }} title={state.path || 'Drives'}>
                        {state.path || 'Drives'}
                    </Typography>
                    <Tooltip title="New folder here">
                        <span>
                            <IconButton size="small" disabled={state.roots} onClick={newFolder}>
                                <CreateNewFolderOutlinedIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
                {error && <Typography variant="caption" color="error">{error}</Typography>}
                <List dense sx={{ height: 320, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    {state.dirs.map((d) => (
                        <ListItemButton key={d} onClick={() => enter(d)} onDoubleClick={() => enter(d)}>
                            <ListItemIcon sx={{ minWidth: 32 }}><FolderIcon fontSize="small" color="primary" /></ListItemIcon>
                            <ListItemText primary={d} primaryTypographyProps={{ fontSize: 13 }} />
                        </ListItemButton>
                    ))}
                    {!state.dirs.length && (
                        <Box sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">No subfolders.</Typography></Box>
                    )}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" startIcon={<FolderOpenIcon />} disabled={state.roots || !state.path}
                    onClick={() => { onSelect(state.path); onClose(); }}>
                    Select this folder
                </Button>
            </DialogActions>
        </Dialog>
    );
}

interface FieldProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    helperText?: string;
    pickerTitle?: string;
}

/** Text field with a built-in "browse…" folder picker. */
export function FolderField({ label, value, onChange, placeholder, helperText, pickerTitle }: FieldProps) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <TextField
                size="small" fullWidth label={label} value={value} placeholder={placeholder} helperText={helperText}
                onChange={(e) => onChange(e.target.value)}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <Tooltip title="Browse…">
                                <IconButton size="small" edge="end" onClick={() => setOpen(true)}>
                                    <FolderOpenIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </InputAdornment>
                    ),
                }}
            />
            <FolderPickerDialog
                open={open} title={pickerTitle ?? label} initialPath={value || undefined}
                onClose={() => setOpen(false)} onSelect={onChange}
            />
        </>
    );
}
