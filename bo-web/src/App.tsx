import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type AppState, type FileNode, type FileTarget, type Template } from './api';
import { CreateTemplateDialog } from './components/CreateTemplateDialog';
import { useDialogs } from './components/dialogs';
import { EditorView } from './components/EditorView';
import { FolderPickerDialog } from './components/FolderPicker';
import { GuideDialog } from './components/GuideDialog';
import { RightPanel } from './components/RightPanel';
import { SolutionTree } from './components/SolutionTree';

type Severity = 'success' | 'error' | 'info';

export function App() {
    const [state, setState] = useState<AppState>({ templates: [], dirs: [], cwd: '' });
    const [selected, setSelected] = useState<string | null>(null);
    const [workspace, setWorkspace] = useState<string | null>(null);
    const [drawerW, setDrawerW] = useState(280);
    const [panelW, setPanelW] = useState(380);
    const [snack, setSnack] = useState<{ msg: string; sev: Severity } | null>(null);
    const [result, setResult] = useState<unknown>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);
    const [folderPickerOpen, setFolderPickerOpen] = useState(false);
    const [tplMenu, setTplMenu] = useState<{ x: number; y: number; name: string } | null>(null);
    const [openReq, setOpenReq] = useState<{ path: string; nonce: number } | null>(null);
    const dirtyRef = useRef(0);
    const reloadRef = useRef<() => Promise<void>>(async () => undefined);

    useEffect(() => {
        try {
            if (!localStorage.getItem('bo-guide-seen')) { setGuideOpen(true); localStorage.setItem('bo-guide-seen', '1'); }
        } catch { /* storage blocked */ }
    }, []);

    const { confirm, prompt } = useDialogs();
    const notify = useCallback((msg: string, sev: Severity = 'info') => setSnack({ msg, sev }), []);

    const guardDirty = useCallback(async (): Promise<boolean> => {
        if (!dirtyRef.current) return true;
        return confirm({ title: 'Unsaved changes', message: `${dirtyRef.current} file(s) have unsaved changes. Discard them?`, confirmText: 'Discard', danger: true });
    }, [confirm]);

    const resizer = (set: (w: number) => void, get: () => number, min: number, max: number, invert = false) => (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = get();
        const onMove = (ev: MouseEvent) => { const d = invert ? startX - ev.clientX : ev.clientX - startX; set(Math.min(max, Math.max(min, startW + d))); };
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const WS_KEY = 'bo-workspace';
    const openWorkspace = useCallback((dir: string) => { setWorkspace(dir); try { localStorage.setItem(WS_KEY, dir); } catch { /* */ } }, []);
    const closeWorkspace = useCallback(async () => { if (!(await guardDirty())) return; setWorkspace(null); try { localStorage.removeItem(WS_KEY); } catch { /* */ } }, [guardDirty]);

    const openFolder = useCallback(async (dir: string) => {
        if (!(await guardDirty())) return;
        try { await api.files({ root: dir }); openWorkspace(dir); }
        catch (e) { notify((e as Error).message, 'error'); }
    }, [notify, openWorkspace, guardDirty]);

    useEffect(() => {
        let saved: string | null = null;
        try { saved = localStorage.getItem(WS_KEY); } catch { saved = null; }
        if (!saved) return;
        api.files({ root: saved }).then(() => openWorkspace(saved!)).catch(() => { try { localStorage.removeItem(WS_KEY); } catch { /* */ } });
    }, [openWorkspace]);

    const reload = useCallback(async () => {
        try {
            const s = await api.state();
            setState(s);
            setSelected((cur) => (cur && s.templates.some((t) => t.name === cur) ? cur : s.templates[0]?.name ?? null));
        } catch (e) { notify((e as Error).message, 'error'); }
    }, [notify]);

    useEffect(() => { reloadRef.current = reload; }, [reload]);
    useEffect(() => { reload(); }, [reload]);

    const registerWorkspace = useCallback(async () => {
        if (!workspace) return;
        try { await api.addDir({ dir: workspace }); notify('Registered as templates directory', 'success'); reload(); }
        catch (e) { notify((e as Error).message, 'error'); }
    }, [workspace, notify, reload]);

    const template: Template | null = state.templates.find((t) => t.name === selected) ?? null;

    const selectTemplate = useCallback(async (name: string): Promise<boolean> => {
        if (name === selected && !workspace) return true;
        if (!(await guardDirty())) return false;
        setWorkspace(null);
        try { localStorage.removeItem(WS_KEY); } catch { /* */ }
        setSelected(name);
        return true;
    }, [selected, workspace, guardDirty]);

    const onCreated = (name: string) => { reload().then(() => { selectTemplate(name); }); };

    const openFileFromTree = async (name: string, file: FileNode) => {
        if (!(await selectTemplate(name))) return;
        setOpenReq({ path: file.path, nonce: Date.now() });
    };

    const renameTemplate = async (name: string) => {
        setTplMenu(null);
        const newName = await prompt({ title: `Rename "${name}"`, label: 'New short name', defaultValue: name, confirmText: 'Rename' });
        if (!newName || newName === name) return;
        try { const r = await api.renameTemplate({ templateName: name, newName: newName.trim() }); notify(`Renamed to "${r.name}"`, 'success'); await reloadRef.current(); setSelected(r.name); }
        catch (e) { notify((e as Error).message, 'error'); }
    };
    const deleteTemplate = async (name: string) => {
        setTplMenu(null);
        const ok = await confirm({ title: 'Delete template', message: `Delete "${name}" and all its files from disk? This cannot be undone.`, confirmText: 'Delete template', danger: true });
        if (!ok) return;
        try { await api.deleteTemplate({ templateName: name }); notify(`Deleted "${name}"`, 'info'); reloadRef.current(); }
        catch (e) { notify((e as Error).message, 'error'); }
    };

    const editorTarget: FileTarget | null = workspace ? { root: workspace } : template ? { template: template.name } : null;
    const editorKey = workspace ?? template?.name ?? '';

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
                <Toolbar variant="dense">
                    <Box sx={{ width: 28, height: 28, mr: 1.25, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #5b9dff 0%, #4ade80 100%)', color: '#06121f' }}>
                        <CodeIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }}>create-library</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>dotnet new back-office</Typography>
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setCreateOpen(true)} sx={{ mr: 1 }}>New template</Button>
                    <Button size="small" startIcon={<FolderOpenIcon />} onClick={() => setFolderPickerOpen(true)} sx={{ color: 'text.primary' }}>Open folder…</Button>
                    <Tooltip title="Guide"><IconButton size="small" onClick={() => setGuideOpen(true)} sx={{ ml: 0.5 }}><HelpOutlineIcon fontSize="small" /></IconButton></Tooltip>
                </Toolbar>
            </AppBar>

            <Drawer variant="permanent" sx={{ width: drawerW, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerW, boxSizing: 'border-box', overflow: 'hidden' } }}>
                <Toolbar variant="dense" />
                <Box onMouseDown={resizer(setDrawerW, () => drawerW, 220, 520)} sx={{ position: 'absolute', top: 0, right: 0, width: '5px', height: '100%', cursor: 'col-resize', zIndex: 2, '&:hover': { bgcolor: 'primary.main' } }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1 }}>
                        <Typography variant="overline" color="text.secondary" sx={{ flex: 1 }}>Solution</Typography>
                        <Tooltip title="New template"><IconButton size="small" color="primary" onClick={() => setCreateOpen(true)}><AddIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Refresh"><IconButton size="small" onClick={reload}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                    <Divider />
                    <Box sx={{ overflow: 'auto', flex: 1, py: 0.5 }}>
                        <SolutionTree
                            dirs={state.dirs} templates={state.templates} selected={!workspace ? selected : null}
                            onSelectTemplate={selectTemplate}
                            onOpenFile={openFileFromTree}
                            onTemplateContext={(e, name) => setTplMenu({ x: e.clientX, y: e.clientY, name })}
                            notify={notify}
                        />
                        {!state.templates.length && (
                            <Stack spacing={1} sx={{ px: 2, py: 1 }}>
                                <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New template</Button>
                                <Button size="small" variant="outlined" startIcon={<HelpOutlineIcon />} onClick={() => setGuideOpen(true)}>Open the guide</Button>
                            </Stack>
                        )}
                    </Box>
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
                            <Box sx={{ px: 2, pb: 1 }}><Button size="small" variant="outlined" fullWidth onClick={registerWorkspace}>Register as templates dir</Button></Box>
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
                                <EditorView target={editorTarget} targetKey={editorKey} notify={notify} openRequest={openReq} onDirtyChange={(n) => { dirtyRef.current = n; }} />
                            </Box>
                            {template && !workspace && (
                                <>
                                    <Box onMouseDown={resizer(setPanelW, () => panelW, 300, 640, true)} sx={{ width: '5px', cursor: 'col-resize', flexShrink: 0, borderLeft: 1, borderColor: 'divider', '&:hover': { bgcolor: 'primary.main' } }} />
                                    <Box sx={{ width: panelW, flexShrink: 0, borderLeft: 1, borderColor: 'divider', minHeight: 0 }}>
                                        <RightPanel template={template} state={state} notify={notify} reload={reload} onResult={setResult} onRenamed={(n) => { reload().then(() => setSelected(n)); }} />
                                    </Box>
                                </>
                            )}
                        </>
                    )}
                </Box>
            </Box>

            <CreateTemplateDialog open={createOpen} defaultDir={state.cwd} onClose={() => setCreateOpen(false)} notify={notify} onCreated={onCreated} />
            <GuideDialog open={guideOpen} onClose={() => setGuideOpen(false)} onNewTemplate={() => setCreateOpen(true)} />
            <FolderPickerDialog open={folderPickerOpen} title="Open folder as workspace" initialPath={workspace ?? state.cwd} onClose={() => setFolderPickerOpen(false)} onSelect={openFolder} />

            <Menu open={!!tplMenu} onClose={() => setTplMenu(null)} anchorReference="anchorPosition" anchorPosition={tplMenu ? { top: tplMenu.y, left: tplMenu.x } : undefined}>
                <MenuItem onClick={() => tplMenu && renameTemplate(tplMenu.name)}>Rename…</MenuItem>
                <MenuItem onClick={() => tplMenu && deleteTemplate(tplMenu.name)} sx={{ color: 'error.main' }}>Delete…</MenuItem>
            </Menu>

            <Dialog open={!!result} onClose={() => setResult(null)} maxWidth="md" fullWidth>
                <DialogTitle>Generated</DialogTitle>
                <DialogContent>
                    <Box component="pre" sx={{ bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 1, p: 2, overflow: 'auto', fontSize: 12.5, whiteSpace: 'pre-wrap' }}>
                        {typeof result === 'object' && result && 'output' in (result as any)
                            ? `${(result as any).into}\n\n${(result as any).output}`
                            : JSON.stringify(result, null, 2)}
                    </Box>
                </DialogContent>
            </Dialog>

            <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                {snack ? <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(null)}>{snack.msg}</Alert> : undefined}
            </Snackbar>
        </Box>
    );
}
