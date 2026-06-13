import PublishIcon from '@mui/icons-material/Publish';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import { api, type AppState, type PublishedVersion, type Template } from '../api';
import { useDialogs } from './dialogs';
import { FolderField } from './FolderPicker';
import { Field, PanelInput, PanelSelect, Section, StackedField, SwitchField } from './inspector';
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
            confirmText: 'Delete template', danger: true,
        });
        if (!ok) return;
        try {
            await api.deleteTemplate({ templateName: template.name, deletePublished: true });
            notify(`Deleted "${template.name}"`, 'info');
            reload();
        } catch (e) { notify((e as Error).message, 'error'); }
    };

    return (
        <Section title="Template settings">
            <Field label="Name" hint={name !== template.name ? 'renames folder' : undefined} control={<PanelInput fullWidth value={name} onChange={(e) => setName(e.target.value)} />} />
            <Field label="Title" control={<PanelInput fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />} />
            <Field label="Description" align="start" control={<PanelInput fullWidth multiline maxRows={4} value={description} onChange={(e) => setDescription(e.target.value)} />} />
            <Field label="Version" control={<PanelInput value={version} onChange={(e) => setVersion(e.target.value)} sx={{ width: 96 }} />} />
            <Stack direction="row" spacing={0.75} sx={{ pt: 0.5 }}>
                <Button size="small" variant="contained" disabled={!dirty} onClick={save}>Save</Button>
                <Button size="small" variant="outlined" onClick={validate}>Validate</Button>
                <Box sx={{ flex: 1 }} />
                <Button size="small" color="error" variant="outlined" onClick={del}>Delete…</Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all', fontFamily: 'ui-monospace, monospace', fontSize: 10 }}>{template.dir}</Typography>
        </Section>
    );
}

/* ------------------------------- Variables ------------------------------- */

function VariablesSection({ template, notify, reload }: SectionProps) {
    return (
        <Section title="Variables">
            <VariablesPanel template={template} notify={notify} reload={reload} />
        </Section>
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

    const tk = (t: string) => `${template.tokenConfig.start}${t}${template.tokenConfig.end}`;

    return (
        <Section
            title="Generate to folder"
            description={<>Replaces every {tk('token')} with the values below and merges the result into the target folder (created if missing, existing files kept). For a downloadable zip of the published version, use Export in the top bar.</>}
        >
            {template.variables.length > 0 && (
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: 9.5 }}>Variable values</Typography>
            )}
            {template.variables.map((v) => (
                <Field key={v.name} label={<Box component="span" sx={{ fontFamily: 'ui-monospace, monospace', color: 'secondary.main' }}>{tk(v.token)}</Box>}
                    control={
                        v.type === 'select' ? (
                            <PanelSelect fullWidth value={answers[v.name] ?? ''} onChange={(val) => setAnswers((a) => ({ ...a, [v.name]: val }))}
                                options={(v.options ?? []).map((o) => ({ value: o }))} />
                        ) : (
                            <PanelInput fullWidth value={answers[v.name] ?? ''} placeholder={v.message}
                                onChange={(e) => setAnswers((a) => ({ ...a, [v.name]: e.target.value }))} />
                        )
                    } />
            ))}

            {template.features.length > 0 && (
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: 9.5, mt: 0.5 }}>Features</Typography>
            )}
            {template.features.map((f) => (
                f.type === 'select' ? (
                    <Field key={f.id} label={f.label} control={
                        <PanelSelect value={(features[f.id] as string) ?? ''} onChange={(val) => setFeatures((s) => ({ ...s, [f.id]: val }))}
                            options={(f.options ?? []).map((o) => ({ value: o }))} sx={{ width: 140 }} />
                    } />
                ) : (
                    <SwitchField key={f.id} label={f.label} checked={!!features[f.id]} onChange={(v) => setFeatures((s) => ({ ...s, [f.id]: v }))} />
                )
            ))}

            <Divider sx={{ my: 0.5 }} />
            <StackedField label="Target folder" hint="Merged here; folder is created if missing.">
                <FolderField label="" value={into} onChange={setInto} placeholder={state.cwd} pickerTitle="Target folder" />
            </StackedField>
            <SwitchField label="Overwrite existing files" checked={force} onChange={setForce} />
            <SwitchField label="Include template meta files" hint="template.json, features/" checked={includeManifest} onChange={setIncludeManifest} />
            <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
                <Button variant="contained" startIcon={<RocketLaunchIcon />} onClick={generate}>Generate</Button>
                <Button variant="outlined" onClick={savePreset}>Save preset…</Button>
            </Stack>
        </Section>
    );
}

/* --------------------------- Publish to registry ------------------------- */

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
            reload();
        } catch (e) {
            const msg = (e as Error).message;
            if (!overwrite && /already published/.test(msg)) {
                const ok = await confirm({ title: 'Version already published', message: `${msg} Overwrite the published snapshot?`, confirmText: 'Overwrite', danger: true });
                if (ok) return doExport(true);
            }
            notify(msg, 'error');
        } finally { setBusy(false); }
    };

    return (
        <Section
            title="Publish to registry"
            defaultOpen={false}
            description={<>Publishes a versioned snapshot — placeholders intact — to the local registry. The CLI uses the latest published version.</>}
        >
            <Field label="Version bump" control={
                <PanelSelect value={bump} onChange={(v) => setBump(v as typeof bump)} sx={{ width: 150 }}
                    options={[{ value: 'none', label: `none (${template.version})` }, { value: 'patch' }, { value: 'minor' }, { value: 'major' }]} />
            } />
            <Button size="small" variant="contained" startIcon={<PublishIcon />} disabled={busy} onClick={() => doExport(false)} sx={{ alignSelf: 'flex-start' }}>
                Publish version
            </Button>
            <StackedField label="Published versions">
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                    {versions.length === 0 && <Typography variant="body2" color="text.secondary">None yet.</Typography>}
                    {versions.map((v) => (
                        <Chip key={v.version} size="small" label={v.version} variant="outlined" color={v.version === template.version ? 'secondary' : 'default'} />
                    ))}
                </Stack>
            </StackedField>
        </Section>
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
        <Section title="Components & dirs" defaultOpen={false} description="Scaffold a component + a feature toggle for it.">
            <Stack direction="row" spacing={1}>
                <PanelInput fullWidth placeholder="Modal" value={name} onChange={(e) => setName(e.target.value)} />
                <Button size="small" variant="contained" onClick={addComponent} sx={{ flexShrink: 0 }}>Add</Button>
            </Stack>
            <SwitchField label="Included by default" checked={byDefault} onChange={setByDefault} />
            <Divider sx={{ my: 0.5 }} />
            <StackedField label="Register an external templates directory">
                <Stack direction="row" spacing={1}>
                    <PanelInput fullWidth placeholder="C:\\path\\to\\templates" value={dir} onChange={(e) => setDir(e.target.value)} />
                    <Button size="small" variant="outlined" onClick={addDir} sx={{ flexShrink: 0 }}>Add</Button>
                </Stack>
            </StackedField>
        </Section>
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

export function RightPanel({ template, state, notify, reload, onResult, onRenamed }: PanelProps) {
    return (
        <Box sx={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', position: 'sticky', top: 0, zIndex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" noWrap title={template.name}>{template.title || template.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontFamily: 'ui-monospace, monospace', fontSize: 10.5 }}>{template.name}</Typography>
                    </Box>
                    <Chip size="small" label={`v${template.version}`} color="primary" variant="outlined" sx={{ height: 20 }} />
                </Stack>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto', '& > div + div': { borderTop: 1, borderColor: 'divider' } }}>
                <TemplateSection template={template} state={state} notify={notify} reload={reload} onRenamed={onRenamed} />
                <VariablesSection template={template} state={state} notify={notify} reload={reload} />
                <GenerateSection template={template} state={state} notify={notify} reload={reload} onResult={onResult} />
                <PublishSection template={template} state={state} notify={notify} reload={reload} />
                <ComponentsSection template={template} state={state} notify={notify} reload={reload} />
            </Box>
        </Box>
    );
}
