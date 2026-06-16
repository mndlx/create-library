import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { api, type AppState, type Template } from '../api';
import { useDialogs } from './dialogs';
import { FolderField } from './FolderPicker';
import { Field, PanelInput, PanelSelect, SwitchField } from './inspector';
import { SymbolsPanel } from './SymbolsPanel';

type Notify = (msg: string, sev?: 'success' | 'error' | 'info') => void;

interface SectionProps {
    template: Template;
    state: AppState;
    notify: Notify;
    reload: () => void;
}

const TabBody = ({ children }: { children: React.ReactNode }) => (
    <Box sx={{ px: 1.5, py: 1.5 }}><Stack spacing={0.75}>{children}</Stack></Box>
);

/* ------------------------------- Settings ------------------------------- */

function SettingsBody({ template, notify, reload, onRenamed }: SectionProps & { onRenamed: (name: string) => void }) {
    const { confirm } = useDialogs();
    const [shortName, setShortName] = useState(template.shortName);
    const [title, setTitle] = useState(template.title);
    const [author, setAuthor] = useState(template.author);
    const [sourceName, setSourceName] = useState(template.sourceName);
    const [classifications, setClassifications] = useState(template.classifications.join(', '));

    useEffect(() => {
        setShortName(template.shortName); setTitle(template.title); setAuthor(template.author);
        setSourceName(template.sourceName); setClassifications(template.classifications.join(', '));
    }, [template]);

    const dirty = shortName !== template.shortName || title !== template.title || author !== template.author
        || sourceName !== template.sourceName || classifications !== template.classifications.join(', ');

    const save = async () => {
        try {
            let current = template.name;
            if (shortName.trim() && shortName.trim() !== template.shortName) {
                const r = await api.renameTemplate({ templateName: template.name, newName: shortName.trim() });
                current = r.name;
            }
            await api.setMeta({ templateName: current, title, author, sourceName, classifications });
            notify('Template saved', 'success');
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
        const ok = await confirm({ title: 'Delete template', message: `Delete "${template.shortName}" and all its files from disk? This cannot be undone.`, confirmText: 'Delete template', danger: true });
        if (!ok) return;
        try { await api.deleteTemplate({ templateName: template.name }); notify(`Deleted "${template.shortName}"`, 'info'); reload(); }
        catch (e) { notify((e as Error).message, 'error'); }
    };

    return (
        <>
            <Field label="Short name" hint="dotnet new <shortName>" control={<PanelInput fullWidth value={shortName} onChange={(e) => setShortName(e.target.value)} />} />
            <Field label="Display name" control={<PanelInput fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />} />
            <Field label="Source name" hint="renamed by -n" control={<PanelInput fullWidth value={sourceName} onChange={(e) => setSourceName(e.target.value)} />} />
            <Field label="Author" control={<PanelInput fullWidth value={author} onChange={(e) => setAuthor(e.target.value)} />} />
            <Field label="Tags" hint="classifications, comma" control={<PanelInput fullWidth value={classifications} onChange={(e) => setClassifications(e.target.value)} />} />
            <Stack direction="row" spacing={0.75} sx={{ pt: 0.5 }}>
                <Button size="small" variant="contained" disabled={!dirty} onClick={save}>Save</Button>
                <Button size="small" variant="outlined" onClick={validate}>Validate</Button>
                <Box sx={{ flex: 1 }} />
                <Button size="small" color="error" variant="outlined" onClick={del}>Delete…</Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all', fontFamily: 'ui-monospace, monospace', fontSize: 10 }}>{template.dir}</Typography>
        </>
    );
}

/* -------------------------------- Generate ------------------------------- */

function GenerateBody({ template, state, notify, onResult }: SectionProps & { onResult: (r: unknown) => void }) {
    const [name, setName] = useState('');
    const [params, setParams] = useState<Record<string, string>>({});
    const [into, setInto] = useState('');
    const [force, setForce] = useState(false);

    useEffect(() => {
        setName(template.sourceName || template.shortName);
        setParams(Object.fromEntries(template.symbols.map((s) => [s.name, s.defaultValue ?? ''])));
        setInto(''); setForce(false);
    }, [template]);

    const generate = async () => {
        try {
            const r = await api.generate({ templateName: template.name, name: name || undefined, params, into: into || undefined, force });
            onResult(r);
            notify('Generated', 'success');
        } catch (e) { notify((e as Error).message, 'error'); }
    };

    return (
        <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, mb: 0.5 }}>
                Runs <code>dotnet new {template.shortName}</code> into the target folder with the values below.
            </Typography>
            <Field label="Name (-n)" control={<PanelInput fullWidth value={name} onChange={(e) => setName(e.target.value)} />} />
            {template.symbols.length > 0 && <Typography variant="overline" color="text.secondary" sx={{ fontSize: 9.5 }}>Parameters</Typography>}
            {template.symbols.map((s) => (
                <Field key={s.name} label={s.name} hint={s.description}
                    control={
                        s.datatype === 'bool' ? (
                            <PanelSelect fullWidth value={params[s.name] || 'false'} onChange={(v) => setParams((p) => ({ ...p, [s.name]: v }))} options={[{ value: 'false' }, { value: 'true' }]} />
                        ) : s.datatype === 'choice' ? (
                            <PanelSelect fullWidth value={params[s.name] ?? ''} onChange={(v) => setParams((p) => ({ ...p, [s.name]: v }))} options={(s.choices ?? []).map((c) => ({ value: c }))} />
                        ) : (
                            <PanelInput fullWidth value={params[s.name] ?? ''} placeholder={s.defaultValue} onChange={(e) => setParams((p) => ({ ...p, [s.name]: e.target.value }))} />
                        )
                    } />
            ))}
            <Divider sx={{ my: 0.5 }} />
            <Field label="Target folder" control={<FolderField value={into} onChange={setInto} placeholder={state.cwd} pickerTitle="Target folder" />} />
            <SwitchField label="Force (overwrite)" checked={force} onChange={setForce} />
            <Button variant="contained" startIcon={<RocketLaunchIcon />} onClick={generate} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>Generate</Button>
        </>
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

type PanelTab = 'parameters' | 'generate' | 'settings';

export function RightPanel({ template, state, notify, reload, onResult, onRenamed }: PanelProps) {
    const [tab, setTab] = useState<PanelTab>('parameters');

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" noWrap title={template.title}>{template.title || template.shortName}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontFamily: 'ui-monospace, monospace', fontSize: 10.5 }}>{template.shortName}</Typography>
                    </Box>
                    <Chip size="small" label="dotnet" color="primary" variant="outlined" sx={{ height: 20 }} />
                </Stack>
            </Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
                sx={{ minHeight: 36, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 36, minWidth: 0, px: 1.5, fontSize: 12 } }}>
                <Tab value="parameters" label="Parameters" />
                <Tab value="generate" label="Generate" />
                <Tab value="settings" label="Settings" />
            </Tabs>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {tab === 'parameters' && <Box sx={{ px: 1.5, py: 1.5 }}><SymbolsPanel template={template} notify={notify} reload={reload} /></Box>}
                {tab === 'generate' && <TabBody><GenerateBody template={template} state={state} notify={notify} reload={reload} onResult={onResult} /></TabBody>}
                {tab === 'settings' && <TabBody><SettingsBody template={template} state={state} notify={notify} reload={reload} onRenamed={onRenamed} /></TabBody>}
            </Box>
        </Box>
    );
}
