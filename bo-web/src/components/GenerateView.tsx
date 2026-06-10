import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid2';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';
import { api, type AppState, type OutputMode, type Template } from '../api';
import { useDialogs } from './dialogs';

interface Props {
    template: Template;
    state: AppState;
    notify: (msg: string, sev?: 'success' | 'error' | 'info') => void;
    onResult: (r: unknown) => void;
}

export function GenerateView({ template, state, notify, onResult }: Props) {
    const { prompt } = useDialogs();
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [features, setFeatures] = useState<Record<string, boolean | string>>({});
    const [mode, setMode] = useState<OutputMode>(template.output);
    const [into, setInto] = useState('');
    const [force, setForce] = useState(false);
    const [includeManifest, setIncludeManifest] = useState(false);

    useEffect(() => {
        setAnswers(Object.fromEntries(template.variables.map((v) => [v.name, v.default ?? ''])));
        setFeatures(Object.fromEntries(template.features.map((f) => [f.id, f.default ?? (f.type === 'boolean' ? false : '')])));
        setMode(template.output);
        setInto('');
        setForce(false);
        setIncludeManifest(false);
    }, [template]);

    const generate = async () => {
        try {
            const r = await api.generate({ templateName: template.name, answers, features, mode, into: into || undefined, force, includeManifest });
            onResult(r);
            notify('Generated', 'success');
        } catch (e) {
            notify((e as Error).message, 'error');
        }
    };

    const savePreset = async () => {
        const file = await prompt({ title: 'Save preset', label: 'File', defaultValue: `${template.name}.preset.json`, confirmText: 'Save' });
        if (!file) return;
        try {
            const r = await api.savePreset({ templateName: template.name, answers, features, file });
            notify(`Saved preset to ${r.file}`, 'success');
        } catch (e) {
            notify((e as Error).message, 'error');
        }
    };

    const featureCount = useMemo(() => template.features.length, [template]);

    return (
        <Box sx={{ p: 3, overflow: 'auto', maxWidth: 860 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Typography variant="h6">{template.title}</Typography>
                <Chip size="small" label={template.output} color={template.output === 'merge' ? 'warning' : 'secondary'} variant="outlined" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{template.description}</Typography>

            {template.variables.length > 0 && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                        <Typography variant="overline" color="text.secondary">Variables</Typography>
                        <Grid container spacing={2} sx={{ mt: 0 }}>
                            {template.variables.map((v) => (
                                <Grid size={{ xs: 12, sm: 6 }} key={v.name}>
                                    {v.type === 'select' ? (
                                        <TextField
                                            select fullWidth size="small" label={v.message}
                                            value={answers[v.name] ?? ''}
                                            onChange={(e) => setAnswers((a) => ({ ...a, [v.name]: e.target.value }))}
                                        >
                                            {(v.options ?? []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                                        </TextField>
                                    ) : (
                                        <TextField
                                            fullWidth size="small" label={`${v.message} (${template.tokenConfig.start}${v.token}${template.tokenConfig.end})`}
                                            value={answers[v.name] ?? ''}
                                            onChange={(e) => setAnswers((a) => ({ ...a, [v.name]: e.target.value }))}
                                        />
                                    )}
                                </Grid>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>
            )}

            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Typography variant="overline" color="text.secondary">Features</Typography>
                    {featureCount === 0 && <Typography variant="body2" color="text.secondary">No features.</Typography>}
                    {template.features.map((f) => (
                        <Stack key={f.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.5 }}>
                            <Typography variant="body2">{f.label}</Typography>
                            {f.type === 'select' ? (
                                <TextField
                                    select size="small" sx={{ width: 180 }}
                                    value={(features[f.id] as string) ?? ''}
                                    onChange={(e) => setFeatures((s) => ({ ...s, [f.id]: e.target.value }))}
                                >
                                    {(f.options ?? []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                                </TextField>
                            ) : (
                                <Checkbox
                                    checked={!!features[f.id]}
                                    onChange={(e) => setFeatures((s) => ({ ...s, [f.id]: e.target.checked }))}
                                />
                            )}
                        </Stack>
                    ))}
                </CardContent>
            </Card>

            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Typography variant="overline" color="text.secondary">Output</Typography>
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField select fullWidth size="small" label="Mode" value={mode} onChange={(e) => setMode(e.target.value as OutputMode)}>
                                <MenuItem value="new">new — create folder</MenuItem>
                                <MenuItem value="merge">merge — into existing project</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth size="small" label="Target directory" placeholder={state.cwd} value={into} onChange={(e) => setInto(e.target.value)} />
                        </Grid>
                    </Grid>
                    {mode === 'merge' && (
                        <FormControlLabel control={<Checkbox checked={force} onChange={(e) => setForce(e.target.checked)} />} label="Force overwrite" sx={{ mt: 1 }} />
                    )}
                    <FormControlLabel
                        control={<Checkbox checked={includeManifest} onChange={(e) => setIncludeManifest(e.target.checked)} />}
                        label="Include manifest files (template.json, features/) in output"
                        sx={{ display: 'block' }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Only relevant for flat templates (payload at the template root). Off by default so authoring files don't leak into the output.
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <Button variant="contained" onClick={generate}>Generate</Button>
                        <Button variant="outlined" onClick={savePreset}>Save preset…</Button>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
