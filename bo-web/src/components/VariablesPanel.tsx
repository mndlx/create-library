import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SyncIcon from '@mui/icons-material/Sync';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { api, type Template, type Variable } from '../api';

interface Props {
    template: Template;
    notify: (msg: string, sev?: 'success' | 'error' | 'info') => void;
    reload: () => void;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

function SaveStatus({ state }: { state: SaveState }) {
    if (state === 'saving') return <CircularProgress size={14} />;
    if (state === 'saved') return <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />;
    if (state === 'dirty') return <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />;
    if (state === 'error') return <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />;
    return null;
}

function VariableRow({ template, v, notify, reload }: { template: Template; v: Variable } & Omit<Props, 'template'>) {
    const [form, setForm] = useState({
        message: v.message, def: v.default, type: v.type,
        options: (v.options ?? []).join(', '), exposeCli: v.exposeCli,
    });
    const [state, setState] = useState<SaveState>('idle');

    // Reset when the variable changes identity/content from a re-scan.
    useEffect(() => {
        setForm({ message: v.message, def: v.default, type: v.type, options: (v.options ?? []).join(', '), exposeCli: v.exposeCli });
        setState('idle');
    }, [v]);

    const update = (patch: Partial<typeof form>) => {
        setForm((f) => ({ ...f, ...patch }));
        setState('dirty');
    };

    // Debounced auto-save: persists ~700ms after the last edit.
    useEffect(() => {
        if (state !== 'dirty') return;
        const id = window.setTimeout(async () => {
            setState('saving');
            try {
                await api.setVariable({
                    templateName: template.name,
                    variable: {
                        name: v.name, token: v.token, message: form.message, type: form.type,
                        default: form.def, validate: v.validate,
                        options: form.type === 'select' ? form.options.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
                        exposeCli: form.exposeCli,
                    },
                });
                setState('saved');
            } catch (e) {
                setState('error');
                notify((e as Error).message, 'error');
            }
        }, 700);
        return () => window.clearTimeout(id);
    }, [form, state, template.name, v, notify]);

    const remove = async () => {
        try { await api.removeVariable({ templateName: template.name, token: v.token }); notify('Removed', 'info'); reload(); }
        catch (e) { notify((e as Error).message, 'error'); }
    };

    const tk = `${template.tokenConfig.start}${v.token}${template.tokenConfig.end}`;

    return (
        <Box sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography sx={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, fontSize: 13 }}>{tk}</Typography>
                {v.detected
                    ? <Chip size="small" label="in files" color="secondary" variant="outlined" sx={{ height: 18 }} />
                    : <Chip size="small" label="not in files" color="warning" variant="outlined" sx={{ height: 18 }} />}
                <SaveStatus state={state} />
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Remove saved metadata">
                    <IconButton size="small" onClick={remove}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Tooltip>
            </Stack>
            <Stack spacing={1.25}>
                <TextField size="small" label="Question asked at generation" value={form.message} onChange={(e) => update({ message: e.target.value })} />
                <Stack direction="row" spacing={1}>
                    <TextField size="small" label="Default" value={form.def} onChange={(e) => update({ def: e.target.value })} sx={{ flex: 1 }} />
                    <TextField select size="small" label="Type" value={form.type} onChange={(e) => update({ type: e.target.value as Variable['type'] })} sx={{ width: 100 }}>
                        <MenuItem value="text">text</MenuItem>
                        <MenuItem value="select">select</MenuItem>
                    </TextField>
                </Stack>
                {form.type === 'select' && (
                    <TextField size="small" label="Options (comma-separated)" value={form.options} onChange={(e) => update({ options: e.target.value })} />
                )}
                <Tooltip title="Ask for this token in the CLI (off = its default is used)">
                    <FormControlLabel
                        control={<Switch size="small" checked={form.exposeCli} onChange={(e) => update({ exposeCli: e.target.checked })} />}
                        label={<Typography variant="caption">Expose in CLI</Typography>} sx={{ m: 0 }}
                    />
                </Tooltip>
            </Stack>
        </Box>
    );
}

export function VariablesPanel({ template, notify, reload }: Props) {
    const [start, setStart] = useState(template.tokenConfig.start);
    const [end, setEnd] = useState(template.tokenConfig.end);
    const [newToken, setNewToken] = useState('');

    useEffect(() => { setStart(template.tokenConfig.start); setEnd(template.tokenConfig.end); }, [template.tokenConfig]);

    const saveConfig = async () => {
        try { await api.setTokenConfig({ templateName: template.name, start, end }); notify('Token delimiters saved', 'success'); reload(); }
        catch (e) { notify((e as Error).message, 'error'); }
    };

    const delimitersDirty = start !== template.tokenConfig.start || end !== template.tokenConfig.end;

    const switchDelimiters = async (s: string, e: string) => {
        try { await api.setTokenConfig({ templateName: template.name, start: s, end: e }); notify(`Delimiters switched to ${s}…${e}`, 'success'); reload(); }
        catch (err) { notify((err as Error).message, 'error'); }
    };

    const addVariable = async () => {
        const token = newToken.trim();
        if (!token) return notify('Token name required', 'error');
        if (!/^[A-Za-z0-9_]+$/.test(token)) return notify('Use only letters, numbers, underscore', 'error');
        if (template.variables.some((v) => v.token === token)) return notify('Token already exists', 'error');
        try {
            await api.setVariable({
                templateName: template.name,
                variable: { name: token, token, message: token, type: 'text', default: '', validate: 'none', exposeCli: true },
            });
            notify(`Added ${start}${token}${end}`, 'success');
            setNewToken('');
            reload();
        } catch (e) { notify((e as Error).message, 'error'); }
    };

    return (
        <Box>
            <Typography variant="caption" color="text.secondary">
                Write <code>{start}name{end}</code> in any file (content or filename) and it becomes a variable here.
                Edits save automatically.
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                <TextField size="small" label="Start" value={start} onChange={(e) => setStart(e.target.value)} sx={{ width: 90 }} />
                <TextField size="small" label="End" value={end} onChange={(e) => setEnd(e.target.value)} sx={{ width: 90 }} />
                <Button size="small" variant={delimitersDirty ? 'contained' : 'outlined'} onClick={saveConfig} disabled={!delimitersDirty}>
                    Apply
                </Button>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Re-scan the template files for tokens (after manual edits)">
                    <Button size="small" startIcon={<SyncIcon />} onClick={reload}>Sync</Button>
                </Tooltip>
            </Stack>

            {template.foreignTokens.map((f) => (
                <Alert
                    key={f.config.start + f.config.end}
                    severity="warning"
                    sx={{ mt: 1.5 }}
                    action={
                        <Button color="inherit" size="small" onClick={() => switchDelimiters(f.config.start, f.config.end)}>
                            Use {f.config.start}…{f.config.end}
                        </Button>
                    }
                >
                    Found {f.config.start}…{f.config.end}-style tokens ({f.tokens.slice(0, 4).join(', ')}
                    {f.tokens.length > 4 ? `, +${f.tokens.length - 4}` : ''}) but the delimiters are{' '}
                    {template.tokenConfig.start}…{template.tokenConfig.end} — they won't be replaced. If they're meant
                    to be variables, switch; otherwise ignore.
                </Alert>
            ))}

            <Divider sx={{ my: 1.5 }} />

            {template.variables.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                    No tokens yet — use <code>{start}name{end}</code> in the editor, or add one below.
                </Typography>
            )}
            {template.variables.map((v) => (
                <VariableRow key={v.token} template={template} v={v} notify={notify} reload={reload} />
            ))}

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                <TextField
                    size="small" label="New token" placeholder="apiUrl" value={newToken} fullWidth
                    onChange={(e) => setNewToken(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addVariable(); }}
                />
                <Button variant="contained" startIcon={<AddIcon />} onClick={addVariable} sx={{ flexShrink: 0 }}>Add</Button>
            </Stack>
        </Box>
    );
}
