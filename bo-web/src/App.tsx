import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import Alert from '@mui/material/Alert';
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
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type AppState, type FileTarget, type Template } from './api';
import { CreateTemplateDialog } from './components/CreateTemplateDialog';
import { useDialogs } from './components/dialogs';
import { EditorView } from './components/EditorView';
import { ExportDialog } from './components/ExportDialog';
import { FolderPickerDialog } from './components/FolderPicker';
import { GuideDialog } from './components/GuideDialog';
import { RightPanel } from './components/RightPanel';

type Severity = 'success' | 'error' | 'info';

export function App() {
    const [state, setState] = useState<AppState>({ templates: [], dirs: [], cwd: '' });
    const [selected, setSelected] = useState<string | null>(null);
    const [workspace, setWorkspace] = useState<string | null>(null);
    const [drawerW, setDrawerW] = useState(260);
    const [panelW, setPanelW] = useState(380);
    const [snack, setSnack] = useState<{ msg: string; sev: Severity } | null>(null);
    const [result, setResult] = useState<unknown>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);
    const dirtyRef = useRef(0);

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

    const { confirm } = useDialogs();
    const notify = useCallback((msg: string, sev: Severity = 'info') => setSnack({ msg, sev }), []);

    /** Block navigation away from unsaved editor changes unless confirmed. */
    const guardDirty = useCallback(async (): Promise<boolean> => {
        if (!dirtyRef.current) return true;
        return confirm({
            title: 'Unsaved changes',
            message: `${dirtyRef.current} file(s) have unsaved changes. Discard them?`,
            confirmText: 'Discard',
            danger: true,
        });
    }, [confirm]);

    const resizer = (set: (w: number) => void, get: () => number, min: number, max: number, invert = false) =>
        (e: React.MouseEvent) => {
            e.preventDefault();
            const startX = e.clientX;
            const startW = get();
            const onMove = (ev: MouseEvent) => {
                const delta = invert ? startX - ev.clientX : ev.clientX - startX;
                set(Math.min(max, Math.max(min, startW + delta)));
            };
            const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        };

    const WS_KEY = 'bo-workspace';

    const openWorkspace = useCallback((dir: string) => {
        setWorkspace(dir);
        try { localStorage.setItem(WS_KEY, dir); } catch { /* storage blocked */ }
    }, []);

    const closeWorkspace = useCallback(async () => {
        if (!(await guardDirty())) return;
        setWorkspace(null);
        try { localStorage.removeItem(WS_KEY); } catch { /* storage blocked */ }
    }, [guardDirty]);

    const [folderPickerOpen, setFolderPickerOpen] = useState(false);

    const openFolder = useCallback(async (dir: string) => {
        if (!(await guardDirty())) return;
        try {
            await api.files({ root: dir }); // validate it exists/readable
            openWorkspace(dir);
        } catch (e) {
            notify((e as Error).message, 'error');
        }
    }, [notify, openWorkspace, guardDirty]);

    // Restore the last opened workspace across reloads/restarts.
    useEffect(() => {
        let saved: string | null = null;
        try { saved = localStorage.getItem(WS_KEY); } catch { saved = null; }
        if (!saved) return;
        api.files({ root: saved })
            .then(() => openWorkspace(saved!))
            .catch(() => { try { localStorage.removeItem(WS_KEY); } catch { /* ignore */ } });
    }, [openWorkspace]);

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

    const registerWorkspace = useCallback(async () => {
        if (!workspace) return;
        try { await api.addDir({ dir: workspace }); notify('Registered as templates directory', 'success'); reload(); }
        catch (e) { notify((e as Error).message, 'error'); }
    }, [workspace, notify, reload]);

    const template: Template | null = state.templates.find((t) => t.name === selected) ?? null;

    const selectTemplate = async (name: string) => {
        if (name === selected && !workspace) return;
        if (!(await guardDirty())) return;
        setWorkspace(null);
        try { localStorage.removeItem(WS_KEY); } catch { /* ignore */ }
        setSelected(name);
    };
    const onCreated = (name: string) => { reload().then(() => { selectTemplate(name); }); };

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
                        <Button size="small" startIcon={<FileDownloadIcon />} variant="contained" onClick={() => setExportOpen(true)} sx={{ mr: 1 }}>
                            Export
                        </Button>
                    )}
                    <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setCreateOpen(true)} sx={{ mr: 1 }}>
                        New template
                    </Button>
                    <Button size="small" startIcon={<FolderOpenIcon />} onClick={() => setFolderPickerOpen(true)} sx={{ color: 'text.primary' }}>
                        Open folder…
                    </Button>
                    <Tooltip title="Guide">
                        <IconButton size="small" onClick={() => setGuideOpen(true)} sx={{ ml: 0.5 }}><HelpOutlineIcon fontSize="small" /></IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            <Drawer variant="permanent" sx={{ width: drawerW, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerW, boxSizing: 'border-box', overflow: 'hidden' } }}>
                <Toolbar variant="dense" />
                <Box
                    onMouseDown={resizer(setDrawerW, () => drawerW, 200, 520)}
                    sx={{ position: 'absolute', top: 0, right: 0, width: '5px', height: '100%', cursor: 'col-resize', zIndex: 2, '&:hover': { bgcolor: 'primary.main' } }}
                />
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
                                            <Chip size="small" label={`v${t.version}`} variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                                        </Stack>
                                    }
                                    secondary={`${t.variables.length} var · ${t.features.length} feat`}
                                />
                            </ListItemButton>
                        ))}
                        {!state.templates.length && (
                            <Stack spacing={1} sx={{ px: 2, py: 1 }}>
                                <Typography variant="body2" color="text.secondary">No templates yet.</Typography>
                                <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New template</Button>
                                <Button size="small" variant="outlined" startIcon={<HelpOutlineIcon />} onClick={() => setGuideOpen(true)}>Open the guide</Button>
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
                                <Tooltip title="Close workspace"><IconButton size="small" onClick={closeWorkspace}><CloseIcon fontSize="small" /></IconButton></Tooltip>
                            </Stack>
                            <Box sx={{ px: 2, pb: 1 }}>
                                <Button size="small" variant="outlined" fullWidth onClick={registerWorkspace}>Register as templates dir</Button>
                            </Box>
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
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
                    {!editorTarget ? (
                        <Box sx={{ p: 4, color: 'text.secondary' }}>
                            <Typography sx={{ mb: 1 }}>No template selected. Create one, or use “Open folder…” to edit any workspace.</Typography>
                            <Stack direction="row" spacing={1}>
                                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New template</Button>
                                <Button variant="outlined" size="small" startIcon={<HelpOutlineIcon />} onClick={() => setGuideOpen(true)}>Open the guide</Button>
                            </Stack>
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <EditorView
                                    target={editorTarget}
                                    targetKey={editorKey}
                                    notify={notify}
                                    onDirtyChange={(n) => { dirtyRef.current = n; }}
                                />
                            </Box>
                            {template && !workspace && (
                                <>
                                    <Box
                                        onMouseDown={resizer(setPanelW, () => panelW, 300, 640, true)}
                                        sx={{ width: '5px', cursor: 'col-resize', flexShrink: 0, borderLeft: 1, borderColor: 'divider', '&:hover': { bgcolor: 'primary.main' } }}
                                    />
                                    <Box sx={{ width: panelW, flexShrink: 0, borderLeft: 1, borderColor: 'divider', minHeight: 0 }}>
                                        <RightPanel
                                            template={template} state={state} notify={notify} reload={reload} onResult={setResult}
                                            onRenamed={(n) => { reload().then(() => setSelected(n)); }}
                                        />
                                    </Box>
                                </>
                            )}
                        </>
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

            <ExportDialog open={exportOpen} templateName={template?.name ?? null} onClose={() => setExportOpen(false)} notify={notify} />

            <FolderPickerDialog
                open={folderPickerOpen}
                title="Open folder as workspace"
                initialPath={workspace ?? state.cwd}
                onClose={() => setFolderPickerOpen(false)}
                onSelect={openFolder}
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
