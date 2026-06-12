import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PublishIcon from '@mui/icons-material/Publish';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import { api, type AppState, type PublishedVersion, type Template } from '../api';
import { useDialogs } from './dialogs';
import { FolderField } from './FolderPicker';
import { VariablesPanel } from './VariablesPanel';

type Notify = (msg: string, sev?: 'success' | 'error' | 'info') => void;

interface SectionProps {
    template: Template;
    state: AppState;
    notify: Notify;
    reload: () => void;
}

/* ------------------------------- Template ------------------------------- */

function TemplateSection({ template, notify, reload, onRenamed }: SectionProps & { onRenamed: (name: string) => void }) {
    const { confirm } = useDialogs();
    const [name, setName] = useState(template.name);
    const [title, setTitle] = useState(template.title);
    const [description, setDescription] = useState(template.description);
    const [version, setVersion] = useState(template.version);

    useEffect(() => {
        setName(template.name); setTitle(template.title);
        setDescription(template.description); setVersion(template.version);
    }, [template]);

    const dirty = name !== template.name || title !== template.title
        || description !== template.description || version !== template.version;

    const save = async () => {
        try {
            let current = template.name;
            if (name.trim() && name.trim() !== template.name) {
                const r = await api.renameTemplate({ templateName: template.name, newName: name.trim() });
                current = r.name;
            }
            await api.setMeta({ templateName: current, title, description, version });
            notify('Template settings saved', 'success');
            if (current !== template.name) onRenamed(current);
            else reload();
        } catch (e) { notify((e as Error).message, 'error'); }
    };

    const validate = async () => {
        try {
            const r = await api.validate({ templateName: template.name });
            notify(r.errors.length ? `Invalid: ${r.errors.join('; ')}` : 'Template is valid', r.errors.length ? 'error' : 'success');
        } catch (e) { notify((e as Error).message, 'error'); }
    };

    const del = async () => {
        const ok = await confirm({
            title: 'Delete template',
            message: `Delete "${template.name}" and all its files from disk? Published versions in the registry are removed too. This cannot be undone.`,
            confirmText: 'Delete template',
            danger: true,
        });
        if (!ok) return;
        try {
            await api.deleteTemplate({ templateName: template.name, deletePublished: true });
            notify(`Deleted "${template.name}"`, 'info');
            reload();
        } catch (e) { notify((e as Error).message, 'error'); }
    };

    return (
        <Stack spacing={1.5}>
            <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)}
                helperText={name !== template.name ? 'Renames the manifest and the template folder.' : undefined} />
            <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextField size="small" label="Description" multiline maxRows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            <TextField size="small" label="Version" value={version} onChange={(e) => setVersion(e.target.value)} sx={{ width: 130 }} />
            <Stack direction="row" spacing={1}>
                <Button size="small" variant="contained" disabled={!dirty} onClick={save}>Save settings</Button>
                <Button size="small" variant="outlined" onClick={validate}>Validate</Button>
                <Box sx={{ flex: 1 }} />
                <Button size="small" color="error" variant="outlined" onClick={del}>Delete…</Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>{template.dir}</Typography>
        </Stack>
    );
}

/* --------------------------- Export & publish --------------------------- */

function PublishSection({ template, notify, reload }: SectionProps) {
    const { confirm } = useDialogs();
    const [bump, setBump] = useState<'none' | 'patch' | 'minor' | 'major'>('patch');
    const [versions, setVersions] = useState<PublishedVersion[]>([]);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(() => {
        api.published(template.name).then((r) => setVersions(r.versions)).catch(() => setVersions([]));
    }, [template.name]);

    useEffect(() => { refresh(); }, [refresh]);

    const doExport = async (overwrite = false) => {
        setBusy(true);
        try {
            const r = await api.exportTemplate({ templateName: template.name, bump: bump === 'none' ? undefined : bump, overwrite });
            notify(`Published ${r.name}@${r.version}`, 'success');
            refresh();
            reload(); // version may have been bumped in the manifest
        } catch (e) {
            const msg = (e as Error).message;
            if (!overwrite && /already published/.test(msg)) {
                const ok = await confirm({
                    title: 'Version already published',
                    message: `${msg} Overwrite the published snapshot?`,
                    confirmText: 'Overwrite', danger: true,
                });
                if (ok) return doExport(true);
            }
            notify(msg, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Stack spacing={1.5}>
            <Typography variant="caption" color="text.secondary">
                Publishes a versioned snapshot of the template — placeholders intact — to the local registry
                (<code>~/.virtuallab-create-library/published</code>). The CLI uses the latest published version and
                asks for the values at generation time.
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
                <TextField select size="small" label="Bump" value={bump} onChange={(e) => setBump(e.target.value as typeof bump)} sx={{ width: 120 }}>
                    <MenuItem value="none">none ({template.version})</MenuItem>
                    <MenuItem value="patch">patch</MenuItem>
                    <MenuItem value="minor">minor</MenuItem>
                    <MenuItem value="major">major</MenuItem>
                </TextField>
                <Button size="small" variant="contained" startIcon={<PublishIcon />} disabled={busy} onClick={() => doExport(false)}>
                    Publish version
                </Button>
            </Stack>
            <Box>
                <Typography variant="caption" color="text.secondary">Published versions</Typography>
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                    {versions.length === 0 && <Typography variant="body2" color="text.secondary">None yet.</Typography>}
                    {versions.map((v) => (
                        <Chip key={v.version} size="small" label={v.version} variant="outlined"
                            color={v.version === template.version ? 'secondary' : 'default'} />
                    ))}
                </Stack>
            </Box>
        </Stack>
    );
}

/* -------------------------------- Generate ------------------------------- */

function GenerateSection({ template, state, notify, onResult }: SectionProps & { onResult: (r: unknown) => void }) {
    const { prompt } = useDialogs();
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [features, setFeatures] = useState<Record<string, boolean | string>>({});
    const [into, setInto] = useState('');
    const [force, setForce] = useState(false);
    const [includeManifest, setIncludeManifest] = useState(false);

    useEffect(() => {
        setAnswers(Object.fromEntries(template.variables.map((v) => [v.name, v.default ?? ''])));
        setFeatures(Object.fromEntries(template.features.map((f) => [f.id, f.default ?? (f.type === 'boolean' ? false : '')])));
        setInto(''); setForce(false); setIncludeManifest(false);
    }, [template]);

    const generate = async () => {
        try {
            // Generation always merges into the target folder (created if missing).
            const r = await api.generate({ templateName: template.name, answers, features, mode: 'merge', into: into || undefined, force, includeManifest });
            onResult(r);
            notify('Generated', 'success');
        } catch (e) { notify((e as Error).message, 'error'); }
    };

    const savePreset = async () => {
        const file = await prompt({ title: 'Save preset', label: 'File', defaultValue: `${template.name}.preset.json`, confirmText: 'Save' });
        if (!file) return;
        try {
            const r = await api.savePreset({ templateName: template.name, answers, features, file });
            notify(`Saved preset to ${r.file}`, 'success');
        } catch (e) { notify((e as Error).message, 'error'); }
    };

    return (
        <Stack spacing={1.5}>
            <Typography variant="caption" color="text.secondary">
                Replaces every {template.tokenConfig.start}token{template.tokenConfig.end} (in file contents and names)
                with the values below and writes the result to the target directory. For a downloadable zip of the
                published version, use <b>Export</b> in the top bar.
            </Typography>
            {template.variables.length > 0 && <Typography variant="caption" color="text.secondary">Variable values</Typography>}
            {template.variables.map((v) => (
                v.type === 'select' ? (
                    <TextField key={v.name} select fullWidth size="small" label={v.message} value={answers[v.name] ?? ''}
                        onChange={(e) => setAnswers((a) => ({ ...a, [v.name]: e.target.value }))}>
                        {(v.options ?? []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                    </TextField>
                ) : (
                    <TextField key={v.name} fullWidth size="small"
                        label={`${v.message} (${template.tokenConfig.start}${v.token}${template.tokenConfig.end})`}
                        value={answers[v.name] ?? ''}
                        onChange={(e) => setAnswers((a) => ({ ...a, [v.name]: e.target.value }))} />
                )
            ))}

            {template.features.length > 0 && <Typography variant="caption" color="text.secondary">Features</Typography>}
            {template.features.map((f) => (
                <Stack key={f.id} direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2">{f.label}</Typography>
                    {f.type === 'select' ? (
                        <TextField select size="small" sx={{ width: 140 }} value={(features[f.id] as string) ?? ''}
                            onChange={(e) => setFeatures((s) => ({ ...s, [f.id]: e.target.value }))}>
                            {(f.options ?? []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </TextField>
                    ) : (
                        <Checkbox size="small" checked={!!features[f.id]} onChange={(e) => setFeatures((s) => ({ ...s, [f.id]: e.target.checked }))} />
                    )}
                </Stack>
            ))}

            <Divider />
            <FolderField
                label="Target folder" value={into} onChange={setInto}
                placeholder={state.cwd}
                helperText="Content is merged here (folder is created if missing; existing files kept)."
                pickerTitle="Target folder"
            />
            <FormControlLabel control={<Checkbox size="small" checked={force} onChange={(e) => setForce(e.target.checked)} />}
                label={<Typography variant="body2">Overwrite existing files</Typography>} />
            <FormControlLabel control={<Checkbox size="small" checked={includeManifest} onChange={(e) => setIncludeManifest(e.target.checked)} />}
                label={<Typography variant="body2">Include template meta files (template.json, features/)</Typography>} />
            <Stack direction="row" spacing={1}>
                <Button variant="contained" startIcon={<RocketLaunchIcon />} onClick={generate}>Generate</Button>
                <Button variant="outlined" onClick={savePreset}>Save preset…</Button>
            </Stack>
        </Stack>
    );
}

/* ------------------------------- Components ------------------------------ */

function ComponentsSection({ template, notify, reload }: SectionProps) {
    const [name, setName] = useState('');
    const [byDefault, setByDefault] = useState(false);
    const [dir, setDir] = useState('');

    const addComponent = async () => {
        try {
            await api.addComponent({ templateName: template.name, component: name, default: byDefault });
            notify(`Component "${name}" added`, 'success');
            setName('');
            reload();
        } catch (e) { notify((e as Error).message, 'error'); }
    };

    const addDir = async () => {
        try { const r = await api.addDir({ dir }); notify(`Registered ${r.dir}`, 'success'); setDir(''); reload(); }
        catch (e) { notify((e as Error).message, 'error'); }
    };

    return (
        <Stack spacing={1.5}>
            <Typography variant="caption" color="text.secondary">Scaffold a component + a feature toggle for it.</Typography>
            <Stack direction="row" spacing={1}>
                <TextField size="small" label="Component (PascalCase)" placeholder="Modal" value={name} onChange={(e) => setName(e.target.value)} sx={{ flex: 1 }} />
                <Button size="small" variant="contained" onClick={addComponent} sx={{ flexShrink: 0 }}>Add</Button>
            </Stack>
            <FormControlLabel control={<Checkbox size="small" checked={byDefault} onChange={(e) => setByDefault(e.target.checked)} />}
                label={<Typography variant="body2">Included by default</Typography>} />
            <Divider />
            <Typography variant="caption" color="text.secondary">Register an external templates directory.</Typography>
            <Stack direction="row" spacing={1}>
                <TextField size="small" fullWidth placeholder="C:\\path\\to\\templates" value={dir} onChange={(e) => setDir(e.target.value)} />
                <Button size="small" variant="outlined" onClick={addDir} sx={{ flexShrink: 0 }}>Add</Button>
            </Stack>
        </Stack>
    );
}

/* -------------------------------- Panel --------------------------------- */

interface PanelProps {
    template: Template;
    state: AppState;
    notify: Notify;
    reload: () => void;
    onResult: (r: unknown) => void;
    onRenamed: (name: string) => void;
}

function Section({ title, defaultExpanded, children }: { title: string; defaultExpanded?: boolean; children: React.ReactNode }) {
    return (
        <Accordion disableGutters defaultExpanded={defaultExpanded} sx={{ bgcolor: 'transparent', backgroundImage: 'none', '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                <Typography variant="overline" color="text.secondary">{title}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>{children}</AccordionDetails>
        </Accordion>
    );
}

export function RightPanel({ template, state, notify, reload, onResult, onRenamed }: PanelProps) {
    return (
        <Box sx={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" noWrap sx={{ flex: 1 }} title={template.name}>{template.title || template.name}</Typography>
                    <Chip size="small" label={`v${template.version}`} variant="outlined" sx={{ height: 20 }} />
                </Stack>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Section title="Template settings" defaultExpanded>
                    <TemplateSection template={template} state={state} notify={notify} reload={reload} onRenamed={onRenamed} />
                </Section>
                <Divider />
                <Section title="Variables" defaultExpanded>
                    <VariablesPanel template={template} notify={notify} reload={reload} />
                </Section>
                <Divider />
                <Section title="Generate to folder" defaultExpanded>
                    <GenerateSection template={template} state={state} notify={notify} reload={reload} onResult={onResult} />
                </Section>
                <Divider />
                <Section title="Publish to registry">
                    <PublishSection template={template} state={state} notify={notify} reload={reload} />
                </Section>
                <Divider />
                <Section title="Components & dirs">
                    <ComponentsSection template={template} state={state} notify={notify} reload={reload} />
                </Section>
            </Box>
        </Box>
    );
}
