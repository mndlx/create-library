import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SyncIcon from '@mui/icons-material/Sync';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
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

function VariableRow({ template, v, notify, reload }: { template: Template; v: Variable } & Omit<Props, 'template'>) {
    const [message, setMessage] = useState(v.message);
    const [def, setDef] = useState(v.default);
    const [type, setType] = useState(v.type);
    const [options, setOptions] = useState((v.options ?? []).join(', '));
    const [exposeCli, setExposeCli] = useState(v.exposeCli);

    useEffect(() => { setMessage(v.message); setDef(v.default); setType(v.type); setOptions((v.options ?? []).join(', ')); setExposeCli(v.exposeCli); }, [v]);

    const save = async () => {
        try {
            await api.setVariable({
                templateName: template.name,
                variable: {
                    name: v.name, token: v.token, message, type, default: def, validate: v.validate,
                    options: type === 'select' ? options.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
                    exposeCli,
                },
            });
            notify(`Saved ${v.token}`, 'success');
            reload();
        } catch (e) { notify((e as Error).message, 'error'); }
    };

    const remove = async () => {
        try { await api.removeVariable({ templateName: template.name, token: v.token }); notify('Removed', 'info'); reload(); }
        catch (e) { notify((e as Error).message, 'error'); }
    };

    const tk = `${template.tokenConfig.start}${v.token}${template.tokenConfig.end}`;

    return (
        <Box sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography sx={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>{tk}</Typography>
                {v.detected
                    ? <Chip size="small" label="auto-detected" color="secondary" variant="outlined" sx={{ height: 18 }} />
                    : <Chip size="small" label="not in files" color="warning" variant="outlined" sx={{ height: 18 }} />}
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Remove saved metadata">
                    <IconButton size="small" onClick={remove}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Tooltip>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
                <TextField size="small" label="Question" value={message} onChange={(e) => setMessage(e.target.value)} sx={{ flex: 2 }} />
                <TextField size="small" label="Default" value={def} onChange={(e) => setDef(e.target.value)} sx={{ flex: 1 }} />
                <TextField select size="small" label="Type" value={type} onChange={(e) => setType(e.target.value as Variable['type'])} sx={{ width: 120 }}>
                    <MenuItem value="text">text</MenuItem>
                    <MenuItem value="select">select</MenuItem>
                </TextField>
                {type === 'select' && (
                    <TextField size="small" label="Options (comma)" value={options} onChange={(e) => setOptions(e.target.value)} sx={{ flex: 1 }} />
                )}
                <Tooltip title="Ask for this token in the CLI">
                    <FormControlLabel
                        control={<Switch size="small" checked={exposeCli} onChange={(e) => setExposeCli(e.target.checked)} />}
                        label="CLI" sx={{ m: 0 }}
                    />
                </Tooltip>
                <Button size="small" variant="contained" onClick={save}>Save</Button>
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
        <>
            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Typography variant="overline" color="text.secondary">Token configuration</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Wrap a dynamic token in your files as <code>{start}name{end}</code>. Anything matching this becomes a variable below.
                    </Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <TextField size="small" label="Start" value={start} onChange={(e) => setStart(e.target.value)} sx={{ width: 120 }} />
                        <TextField size="small" label="End" value={end} onChange={(e) => setEnd(e.target.value)} sx={{ width: 120 }} />
                        <Chip label={`${start}example${end}`} sx={{ fontFamily: 'ui-monospace, monospace' }} variant="outlined" />
                        <Box sx={{ flex: 1 }} />
                        <Button variant="contained" onClick={saveConfig}>Save</Button>
                    </Stack>
                </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="overline" color="text.secondary" sx={{ flex: 1 }}>Variables (inspector)</Typography>
                        <Button size="small" startIcon={<SyncIcon />} onClick={reload}>Sync from files</Button>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        Auto-detected from the template files. “Sync from files” re-scans after manual edits. Set the question, default and whether the CLI asks for each.
                    </Typography>
                    <Divider sx={{ mt: 1 }} />
                    {template.variables.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            No tokens yet. Use <code>{start}name{end}</code> in a file or filename in the Editor, or add one below.
                        </Typography>
                    )}
                    {template.variables.map((v) => (
                        <VariableRow key={v.token} template={template} v={v} notify={notify} reload={reload} />
                    ))}

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                        <TextField
                            size="small" label="New token name" placeholder="apiUrl" value={newToken}
                            onChange={(e) => setNewToken(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addVariable(); }}
                            InputProps={{ startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 0.5, fontFamily: 'ui-monospace, monospace' }}>{start}</Box>,
                                endAdornment: <Box component="span" sx={{ color: 'text.secondary', ml: 0.5, fontFamily: 'ui-monospace, monospace' }}>{end}</Box> }}
                            sx={{ width: 280 }}
                        />
                        <Button variant="contained" startIcon={<AddIcon />} onClick={addVariable}>Add variable</Button>
                    </Stack>
                </CardContent>
            </Card>
        </>
    );
}
