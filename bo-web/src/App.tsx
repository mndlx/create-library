import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import { api, type AppState, type FileTarget, type Template } from './api';
import { AuthorView } from './components/AuthorView';
import { CreateTemplateDialog } from './components/CreateTemplateDialog';
import { GuideDialog } from './components/GuideDialog';
import { useDialogs } from './components/dialogs';
import { EditorView } from './components/EditorView';
import { GenerateView } from './components/GenerateView';

const DRAWER_W = 280;
type View = 'editor' | 'generate' | 'author';
type Severity = 'success' | 'error' | 'info';

export function App() {
    const [state, setState] = useState<AppState>({ templates: [], dirs: [], cwd: '' });
    const [selected, setSelected] = useState<string | null>(null);
    const [workspace, setWorkspace] = useState<string | null>(null);
    const [view, setView] = useState<View>('editor');
    const [snack, setSnack] = useState<{ msg: string; sev: Severity } | null>(null);
    const [result, setResult] = useState<unknown>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);

    // Show the guide automatically on the first visit.
    useEffect(() => {
        try {
            if (!localStorage.getItem('bo-guide-seen')) {
                setGuideOpen(true);
                localStorage.setItem('bo-guide-seen', '1');
            }
        } catch {
            /* storage blocked — skip */
        }
    }, []);

    const { prompt } = useDialogs();
    const notify = useCallback((msg: string, sev: Severity = 'info') => setSnack({ msg, sev }), []);

    const openFolder = useCallback(async () => {
        const dir = await prompt({
            title: 'Open folder',
            label: 'Absolute path',
            defaultValue: state.cwd,
            placeholder: 'C:\\path\\to\\project',
            helperText: 'Open any directory as an editable workspace.',
            confirmText: 'Open',
        });
        if (!dir) return;
        try {
            await api.files({ root: dir }); // validate it exists/readable
            setWorkspace(dir);
            setView('editor');
        } catch (e) {
            notify((e as Error).message, 'error');
        }
    }, [prompt, state.cwd, notify]);

    const reload = useCallback(async () => {
        try {
            const s = await api.state();
            setState(s);
            setSelected((cur) => (cur && s.templates.some((t) => t.name === cur) ? cur : s.templates[0]?.name ?? null));
        } catch (e) {
            notify((e as Error).message, 'error');
        }
    }, [notify]);

    useEffect(() => { reload(); }, [reload]);

    const template: Template | null = state.templates.find((t) => t.name === selected) ?? null;

    const selectTemplate = (name: string) => { setWorkspace(null); setSelected(name); };
    const onCreated = (name: string) => { reload().then(() => { selectTemplate(name); setView('editor'); }); };

    const editorTarget: FileTarget | null = workspace ? { root: workspace } : template ? { template: template.name } : null;
    const editorKey = workspace ?? template?.name ?? '';

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
                <Toolbar variant="dense">
                    <CodeIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>create-library</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>· back-office</Typography>
                    <Box sx={{ flex: 1 }} />
                    {template && !workspace && (
                        <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ minHeight: 0, mr: 2 }}>
                            <Tab label="Editor" value="editor" sx={{ minHeight: 0, py: 1 }} />
                            <Tab label="Generate" value="generate" sx={{ minHeight: 0, py: 1 }} />
                            <Tab label="Author" value="author" sx={{ minHeight: 0, py: 1 }} />
                        </Tabs>
                    )}
                    <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setCreateOpen(true)} sx={{ mr: 1 }}>
                        New template
                    </Button>
                    <Button size="small" startIcon={<FolderOpenIcon />} onClick={openFolder} sx={{ color: 'text.primary' }}>
                        Open folder…
                    </Button>
                    <Tooltip title="Guide">
                        <IconButton size="small" onClick={() => setGuideOpen(true)} sx={{ ml: 0.5 }}><HelpOutlineIcon fontSize="small" /></IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            <Drawer variant="permanent" sx={{ width: DRAWER_W, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_W, boxSizing: 'border-box' } }}>
                <Toolbar variant="dense" />
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1 }}>
                        <Typography variant="overline" color="text.secondary" sx={{ flex: 1 }}>Templates</Typography>
                        <Tooltip title="New template"><IconButton size="small" color="primary" onClick={() => setCreateOpen(true)}><AddIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Refresh"><IconButton size="small" onClick={reload}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                    <Divider />
                    <List dense sx={{ overflow: 'auto', flex: 1 }}>
                        {state.templates.map((t) => (
                            <ListItemButton key={t.name} selected={!workspace && t.name === selected} onClick={() => selectTemplate(t.name)}>
                                <ListItemText
                                    primary={
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <span>{t.name}</span>
                                            <Chip size="small" label={t.output} variant="outlined" color={t.output === 'merge' ? 'warning' : 'secondary'} sx={{ height: 18, fontSize: 10 }} />
                                        </Stack>
                                    }
                                    secondary={`${t.prompts.length} var · ${t.features.length} feat`}
                                />
                            </ListItemButton>
                        ))}
                        {!state.templates.length && (
                            <Stack spacing={1} sx={{ px: 2, py: 1 }}>
                                <Typography variant="body2" color="text.secondary">No templates yet.</Typography>
                                <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New template</Button>
                            </Stack>
                        )}
                    </List>
                    <Divider />
                    {workspace && (
                        <>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1, bgcolor: 'action.selected' }}>
                                <FolderOpenIcon fontSize="small" color="primary" />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="caption" color="text.secondary" display="block">Workspace</Typography>
                                    <Typography variant="body2" noWrap title={workspace} sx={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{workspace}</Typography>
                                </Box>
                                <Tooltip title="Close workspace"><IconButton size="small" onClick={() => setWorkspace(null)}><CloseIcon fontSize="small" /></IconButton></Tooltip>
                            </Stack>
                            <Divider />
                        </>
                    )}
                    <Box sx={{ p: 2, fontSize: 11, color: 'text.secondary', wordBreak: 'break-all' }}>
                        <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>Template dirs</Typography>
                        {state.dirs.map((d) => <div key={d}>· {d}</div>)}
                        <Typography variant="caption" display="block" sx={{ fontWeight: 600, mt: 1 }}>cwd</Typography>
                        <div>{state.cwd}</div>
                    </Box>
                </Box>
            </Drawer>

            <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Toolbar variant="dense" />
                <Box sx={{ flex: 1, minHeight: 0 }}>
                    {workspace && editorTarget ? (
                        <EditorView target={editorTarget} targetKey={editorKey} notify={notify} />
                    ) : !template ? (
                        <Box sx={{ p: 4, color: 'text.secondary', height: '100%', overflow: 'auto' }}>
                            <Typography sx={{ mb: 1 }}>No template selected. Create one below, register a templates directory, or use “Open folder…” to edit any workspace.</Typography>
                            <Button variant="outlined" size="small" startIcon={<HelpOutlineIcon />} onClick={() => setGuideOpen(true)} sx={{ mb: 2 }}>Open the guide</Button>
                            <AuthorView template={null} state={state} notify={notify} reload={reload} onCreated={onCreated} />
                        </Box>
                    ) : view === 'editor' && editorTarget ? (
                        <EditorView target={editorTarget} targetKey={editorKey} notify={notify} />
                    ) : view === 'generate' ? (
                        <GenerateView template={template} state={state} notify={notify} onResult={setResult} />
                    ) : (
                        <AuthorView template={template} state={state} notify={notify} reload={reload} onCreated={onCreated} />
                    )}
                </Box>
            </Box>

            <CreateTemplateDialog
                open={createOpen}
                defaultDir={state.cwd}
                onClose={() => setCreateOpen(false)}
                notify={notify}
                onCreated={onCreated}
            />

            <GuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} onNewTemplate={() => setCreateOpen(true)} />

            <Dialog open={!!result} onClose={() => setResult(null)} maxWidth="md" fullWidth>
                <DialogTitle>Result</DialogTitle>
                <DialogContent>
                    <Box component="pre" sx={{ bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 1, p: 2, overflow: 'auto', fontSize: 12.5, whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(result, null, 2)}
                    </Box>
                </DialogContent>
            </Dialog>

            <Snackbar
                open={!!snack}
                autoHideDuration={4000}
                onClose={() => setSnack(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                {snack ? <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(null)}>{snack.msg}</Alert> : undefined}
            </Snackbar>
        </Box>
    );
}
