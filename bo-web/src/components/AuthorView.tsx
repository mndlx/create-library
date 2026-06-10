import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid2';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { api, type AppState, type OutputMode, type PromptDef, type Template } from '../api';

interface Props {
    template: Template | null;
    state: AppState;
    notify: (msg: string, sev?: 'success' | 'error' | 'info') => void;
    reload: () => void;
    onCreated?: (name: string) => void;
}

export function AuthorView({ template, state, notify, reload, onCreated }: Props) {
    // create template
    const [ct, setCt] = useState({ name: '', title: '', description: '', output: 'new' as OutputMode, rootDir: '' });
    // add variable
    const [av, setAv] = useState({ name: '', message: '', type: 'text' as PromptDef['type'], token: '', default: '', validate: 'none', options: '' });
    // add component
    const [ac, setAc] = useState({ name: '', default: false });
    const [dir, setDir] = useState('');

    const wrap = (fn: () => Promise<unknown>, ok: string) => async () => {
        try { await fn(); notify(ok, 'success'); reload(); }
        catch (e) { notify((e as Error).message, 'error'); }
    };

    const createTemplate = async () => {
        if (!ct.name.trim()) return notify('A template name is required', 'error');
        try {
            const r = await api.createTemplate({ ...ct, rootDir: ct.rootDir || state.cwd });
            notify(`Template created at ${r.dir}`, 'success');
            setCt({ name: '', title: '', description: '', output: 'new', rootDir: '' });
            if (onCreated) onCreated(r.name);
            else reload();
        } catch (e) {
            notify((e as Error).message, 'error');
        }
    };

    const addVariable = wrap(() => {
        if (!template) throw new Error('Select a template first');
        const prompt: PromptDef = { name: av.name, message: av.message, type: av.type, token: av.token || undefined };
        if (av.default) prompt.default = av.default;
        if (av.type === 'select') prompt.options = av.options.split(',').map((s) => s.trim()).filter(Boolean);
        else prompt.validate = av.validate;
        return api.addVariable({ templateName: template.name, prompt });
    }, 'Variable added');

    const addComponent = wrap(() => {
        if (!template) throw new Error('Select a template first');
        return api.addComponent({ templateName: template.name, component: ac.name, default: ac.default });
    }, 'Component added');

    const addDir = wrap(() => api.addDir({ dir }), 'Directory registered');

    const validate = async () => {
        if (!template) return notify('Select a template first', 'info');
        try {
            const r = await api.validate({ templateName: template.name });
            notify(r.errors.length ? `Invalid: ${r.errors.join('; ')}` : 'Template is valid', r.errors.length ? 'error' : 'success');
        } catch (e) { notify((e as Error).message, 'error'); }
    };

    return (
        <Box sx={{ p: 3, overflow: 'auto', maxWidth: 900 }}>
            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Typography variant="overline" color="text.secondary">Create template</Typography>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Name" placeholder="my-template" value={ct.name} onChange={(e) => setCt({ ...ct, name: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Title" value={ct.title} onChange={(e) => setCt({ ...ct, title: e.target.value })} /></Grid>
                        <Grid size={12}><TextField fullWidth size="small" label="Description" value={ct.description} onChange={(e) => setCt({ ...ct, description: e.target.value })} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField select fullWidth size="small" label="Output mode" value={ct.output} onChange={(e) => setCt({ ...ct, output: e.target.value as OutputMode })}>
                                <MenuItem value="new">new (creates a folder)</MenuItem>
                                <MenuItem value="merge">merge (into existing project)</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth size="small" label="Create in directory" placeholder={state.cwd} value={ct.rootDir} onChange={(e) => setCt({ ...ct, rootDir: e.target.value })} /></Grid>
                    </Grid>
                    <Button variant="contained" sx={{ mt: 2 }} onClick={createTemplate}>Create</Button>
                </CardContent>
            </Card>

            <Card variant="outlined">
                <CardContent>
                    <Typography variant="overline" color="text.secondary">
                        Configure selected template {template ? `— ${template.name}` : ''}
                    </Typography>
                    <Grid container spacing={3} sx={{ mt: 0 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Add a variable</Typography>
                            <Stack spacing={1.5}>
                                <TextField size="small" label="Name" placeholder="apiUrl" value={av.name} onChange={(e) => setAv({ ...av, name: e.target.value })} />
                                <TextField size="small" label="Question" placeholder="API base URL" value={av.message} onChange={(e) => setAv({ ...av, message: e.target.value })} />
                                <Stack direction="row" spacing={1}>
                                    <TextField select size="small" label="Type" sx={{ width: 140 }} value={av.type} onChange={(e) => setAv({ ...av, type: e.target.value as PromptDef['type'] })}>
                                        <MenuItem value="text">text</MenuItem>
                                        <MenuItem value="select">select</MenuItem>
                                    </TextField>
                                    <TextField size="small" label="Token (__TOKEN__)" fullWidth value={av.token} onChange={(e) => setAv({ ...av, token: e.target.value })} />
                                </Stack>
                                <TextField size="small" label="Default" value={av.default} onChange={(e) => setAv({ ...av, default: e.target.value })} />
                                {av.type === 'text' ? (
                                    <TextField select size="small" label="Validator" value={av.validate} onChange={(e) => setAv({ ...av, validate: e.target.value })}>
                                        <MenuItem value="none">none</MenuItem>
                                        <MenuItem value="packageName">packageName</MenuItem>
                                        <MenuItem value="nonEmpty">nonEmpty</MenuItem>
                                    </TextField>
                                ) : (
                                    <TextField size="small" label="Options (comma-separated)" placeholder="dev, prod" value={av.options} onChange={(e) => setAv({ ...av, options: e.target.value })} />
                                )}
                                <Button variant="contained" onClick={addVariable}>Add variable</Button>
                            </Stack>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Add a component</Typography>
                            <Stack spacing={1.5}>
                                <TextField size="small" label="Name (PascalCase)" placeholder="Modal" value={ac.name} onChange={(e) => setAc({ ...ac, name: e.target.value })} />
                                <FormControlLabel control={<Checkbox checked={ac.default} onChange={(e) => setAc({ ...ac, default: e.target.checked })} />} label="Included by default" />
                                <Button variant="contained" onClick={addComponent}>Add component</Button>

                                <Typography variant="subtitle2" sx={{ mt: 2 }}>Register external templates directory</Typography>
                                <Stack direction="row" spacing={1}>
                                    <TextField size="small" fullWidth placeholder="C:\\path\\to\\templates" value={dir} onChange={(e) => setDir(e.target.value)} />
                                    <Button variant="outlined" onClick={addDir}>Add</Button>
                                </Stack>
                                <Button variant="outlined" onClick={validate}>Validate template</Button>
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
}
