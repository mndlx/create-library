import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { api, type Datatype, type DotnetSymbol, type Template } from '../api';
import { Field, PanelInput, PanelSelect } from './inspector';

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

const DATATYPES = [{ value: 'string' }, { value: 'bool' }, { value: 'choice' }, { value: 'text' }];

function SymbolRow({ template, sym, notify, reload }: { template: Template; sym: DotnetSymbol } & Omit<Props, 'template'>) {
    const [form, setForm] = useState({
        datatype: sym.datatype, defaultValue: sym.defaultValue ?? '', replaces: sym.replaces ?? '',
        description: sym.description ?? '', choices: (sym.choices ?? []).join(', '),
    });
    const [state, setState] = useState<SaveState>('idle');

    useEffect(() => {
        setForm({ datatype: sym.datatype, defaultValue: sym.defaultValue ?? '', replaces: sym.replaces ?? '', description: sym.description ?? '', choices: (sym.choices ?? []).join(', ') });
        setState('idle');
    }, [sym]);

    const update = (patch: Partial<typeof form>) => { setForm((f) => ({ ...f, ...patch })); setState('dirty'); };

    useEffect(() => {
        if (state !== 'dirty') return;
        const id = window.setTimeout(async () => {
            setState('saving');
            try {
                await api.setSymbol({
                    templateName: template.name,
                    symbol: {
                        name: sym.name, datatype: form.datatype, defaultValue: form.defaultValue || undefined,
                        replaces: form.replaces || undefined, description: form.description || undefined,
                        choices: form.datatype === 'choice' ? form.choices.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
                    },
                });
                setState('saved');
            } catch (e) { setState('error'); notify((e as Error).message, 'error'); }
        }, 700);
        return () => window.clearTimeout(id);
    }, [form, state, template.name, sym, notify]);

    const remove = async () => {
        try { await api.removeSymbol({ templateName: template.name, name: sym.name }); notify('Removed', 'info'); reload(); }
        catch (e) { notify((e as Error).message, 'error'); }
    };

    return (
        <Box sx={{ py: 1.25 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                <Typography sx={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 12.5, color: 'secondary.main' }}>{sym.name}</Typography>
                <Chip size="small" label={form.datatype} variant="outlined" sx={{ height: 17, fontSize: 10 }} />
                <SaveStatus state={state} />
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Remove parameter"><IconButton size="small" onClick={remove}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
            </Stack>
            <Stack spacing={0.75}>
                <Field label="Description" labelWidth={76} control={<PanelInput fullWidth value={form.description} onChange={(e) => update({ description: e.target.value })} />} />
                <Field label="Replaces" labelWidth={76} control={<PanelInput fullWidth placeholder="token in files" value={form.replaces} onChange={(e) => update({ replaces: e.target.value })} />} />
                <Field label="Datatype" labelWidth={76} control={<PanelSelect fullWidth value={form.datatype} onChange={(v) => update({ datatype: v as Datatype })} options={DATATYPES} />} />
                {form.datatype === 'choice' && (
                    <Field label="Choices" labelWidth={76} control={<PanelInput fullWidth placeholder="a, b, c" value={form.choices} onChange={(e) => update({ choices: e.target.value })} />} />
                )}
                <Field label="Default" labelWidth={76} control={
                    form.datatype === 'bool'
                        ? <PanelSelect fullWidth value={form.defaultValue || 'false'} onChange={(v) => update({ defaultValue: v })} options={[{ value: 'false' }, { value: 'true' }]} />
                        : form.datatype === 'choice'
                            ? <PanelSelect fullWidth value={form.defaultValue} onChange={(v) => update({ defaultValue: v })} options={form.choices.split(',').map((s) => s.trim()).filter(Boolean).map((c) => ({ value: c }))} />
                            : <PanelInput fullWidth value={form.defaultValue} onChange={(e) => update({ defaultValue: e.target.value })} />
                } />
            </Stack>
        </Box>
    );
}

export function SymbolsPanel({ template, notify, reload }: Props) {
    const [newName, setNewName] = useState('');

    const add = async () => {
        const name = newName.trim();
        if (!name) return notify('Parameter name required', 'error');
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return notify('Use a valid identifier (letters, digits, _)', 'error');
        if (template.symbols.some((s) => s.name === name)) return notify('Parameter already exists', 'error');
        try {
            await api.setSymbol({ templateName: template.name, symbol: { name, datatype: 'string', defaultValue: '', replaces: name.toUpperCase() } });
            notify(`Added parameter ${name}`, 'success');
            setNewName('');
            reload();
        } catch (e) { notify((e as Error).message, 'error'); }
    };

    return (
        <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                Parameters are the template's <code>symbols</code>. <b>Replaces</b> is the literal token in the files
                that the value substitutes (the file name's <code>{template.sourceName || 'sourceName'}</code> is renamed by <b>-n</b>).
            </Typography>
            {template.symbols.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>No parameters yet — add one below.</Typography>
            )}
            {template.symbols.map((s, i) => (
                <Box key={s.name}>
                    {i > 0 && <Divider />}
                    <SymbolRow template={template} sym={s} notify={notify} reload={reload} />
                </Box>
            ))}
            {template.symbols.length > 0 && <Divider sx={{ mt: 0.5 }} />}
            <Field label="New parameter" control={
                <Stack direction="row" spacing={1} alignItems="center">
                    <PanelInput placeholder="e.g. Framework" value={newName} fullWidth
                        onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
                    <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={add} sx={{ flexShrink: 0 }}>Add</Button>
                </Stack>
            } />
        </>
    );
}
