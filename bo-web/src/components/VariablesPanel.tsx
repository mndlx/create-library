import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SyncIcon from '@mui/icons-material/Sync';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { api, type Template, type Variable } from '../api';
import { Field, PanelInput, PanelSelect, StackedField, SwitchField } from './inspector';

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
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.25, bgcolor: 'background.paper' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography sx={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 12.5, color: 'secondary.main' }}>{tk}</Typography>
                {v.detected
                    ? <Chip size="small" label="in files" color="secondary" variant="outlined" sx={{ height: 17, fontSize: 10 }} />
                    : <Chip size="small" label="not in files" color="warning" variant="outlined" sx={{ height: 17, fontSize: 10 }} />}
                <SaveStatus state={state} />
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Remove saved metadata">
                    <IconButton size="small" onClick={remove}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Tooltip>
            </Stack>
            <Stack spacing={1}>
                <StackedField label="Question asked at generation">
                    <PanelInput fullWidth value={form.message} onChange={(e) => update({ message: e.target.value })} />
                </StackedField>
                <Stack direction="row" spacing={1}>
                    <StackedField label="Default"><PanelInput fullWidth value={form.def} onChange={(e) => update({ def: e.target.value })} /></StackedField>
                    <Box sx={{ width: 110, flexShrink: 0 }}>
                        <StackedField label="Type">
                            <PanelSelect fullWidth value={form.type} onChange={(val) => update({ type: val as Variable['type'] })}
                                options={[{ value: 'text' }, { value: 'select' }]} />
                        </StackedField>
                    </Box>
                </Stack>
                {form.type === 'select' && (
                    <StackedField label="Options (comma-separated)">
                        <PanelInput fullWidth value={form.options} onChange={(e) => update({ options: e.target.value })} />
                    </StackedField>
                )}
                <SwitchField label="Expose in CLI" hint="off = its default is used" checked={form.exposeCli} onChange={(c) => update({ exposeCli: c })} />
            </Stack>
        </Box>
    );
}

export function VariablesPanel({ template, notify, reload }: Props) {
    const { start, end } = template.tokenConfig;
    const [newToken, setNewToken] = useState('');

    const switchDelimiters = async (s: string, e: string) => {
        try { await api.setTokenConfig({ templateName: template.name, start: s, end: e }); notify(`Delimiters switched to ${s}…${e}`, 'success'); reload(); }
        catch (err) { notify((err as Error).message, 'error'); }
    };

    const addVariable = async () => {
        const token = newToken.trim();
        if (!token) return notify('Token name required', 'error');
        if (!/^[A-Za-z0-9_.-]+$/.test(token)) return notify('Use only letters, numbers, underscore, dot, dash', 'error');
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
        <>
            <Field
                label={<Typography variant="caption" color="text.secondary">Delimiters <Box component="code">{start}…{end}</Box> — from tokenConfig in template.json</Typography>}
                control={
                    <Tooltip title="Re-scan the template files for tokens (after manual edits)">
                        <Button size="small" startIcon={<SyncIcon />} onClick={reload}>Sync</Button>
                    </Tooltip>
                }
            />

            {template.foreignTokens.map((f) => (
                <Alert
                    key={f.config.start + f.config.end}
                    severity="warning"
                    action={
                        <Button color="inherit" size="small" onClick={() => switchDelimiters(f.config.start, f.config.end)}>
                            Use {f.config.start}…{f.config.end}
                        </Button>
                    }
                >
                    Found {f.config.start}…{f.config.end}-style tokens ({f.tokens.slice(0, 4).join(', ')}
                    {f.tokens.length > 4 ? `, +${f.tokens.length - 4}` : ''}) but the delimiters are{' '}
                    {start}…{end} — they won't be replaced.
                </Alert>
            ))}

            {template.variables.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
                    No tokens yet — use <Box component="code">{start}name{end}</Box> in the editor, or add one below.
                </Typography>
            )}
            {template.variables.map((v) => (
                <VariableRow key={v.token} template={template} v={v} notify={notify} reload={reload} />
            ))}

            <Stack direction="row" spacing={1} alignItems="center">
                <PanelInput placeholder="new token, e.g. apiUrl" value={newToken} fullWidth
                    onChange={(e) => setNewToken(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addVariable(); }}
                />
                <Button variant="contained" startIcon={<AddIcon />} onClick={addVariable} sx={{ flexShrink: 0 }}>Add</Button>
            </Stack>
        </>
    );
}
