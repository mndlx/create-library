import Editor from '@monaco-editor/react';
import CloseIcon from '@mui/icons-material/Close';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type FileNode, type FileTarget } from '../api';
import { useDialogs } from './dialogs';
import { FileTree } from './FileTree';

const LANGS: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', css: 'css', scss: 'scss', html: 'html', md: 'markdown',
    yml: 'yaml', yaml: 'yaml', sh: 'shell',
};
const langOf = (p: string) => LANGS[p.split('.').pop()?.toLowerCase() ?? ''] ?? 'plaintext';

interface OpenTab {
    path: string;
    name: string;
    content: string;
    saved: string;
    binary: boolean;
}

interface Props {
    target: FileTarget;
    /** Stable id used for the Monaco model path / reset key. */
    targetKey: string;
    notify: (msg: string, sev?: 'success' | 'error' | 'info') => void;
}

export function EditorView({ target, targetKey, notify }: Props) {
    const { prompt, confirm } = useDialogs();
    const [tree, setTree] = useState<FileNode[]>([]);
    const [tabs, setTabs] = useState<OpenTab[]>([]);
    const [active, setActive] = useState<string | null>(null);
    const [ctx, setCtx] = useState<{ x: number; y: number; node: FileNode | null } | null>(null);

    // Re-resolve the loader whenever the target identity changes.
    const tgt = useMemo(() => target, [targetKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadTree = useCallback(async () => {
        try {
            const { tree } = await api.files(tgt);
            setTree(tree);
        } catch (e) {
            notify((e as Error).message, 'error');
        }
    }, [tgt, notify]);

    useEffect(() => {
        setTabs([]);
        setActive(null);
        loadTree();
    }, [loadTree]);

    const openFile = useCallback(
        async (node: FileNode) => {
            if (tabs.some((t) => t.path === node.path)) {
                setActive(node.path);
                return;
            }
            try {
                const { binary, content } = await api.readFile(tgt, node.path);
                setTabs((t) => [...t, { path: node.path, name: node.name, content, saved: content, binary }]);
                setActive(node.path);
            } catch (e) {
                notify((e as Error).message, 'error');
            }
        },
        [tabs, tgt, notify]
    );

    const current = tabs.find((t) => t.path === active) ?? null;
    const dirty = current ? current.content !== current.saved : false;

    const save = useCallback(async () => {
        if (!current || !dirty) return;
        try {
            await api.saveFile(tgt, { path: current.path, content: current.content });
            setTabs((ts) => ts.map((t) => (t.path === current.path ? { ...t, saved: t.content } : t)));
            notify(`Saved ${current.name}`, 'success');
        } catch (e) {
            notify((e as Error).message, 'error');
        }
    }, [current, dirty, tgt, notify]);

    // Ctrl/Cmd+S to save.
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                save();
            }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [save]);

    const closeTab = (path: string) => {
        setTabs((ts) => ts.filter((t) => t.path !== path));
        if (active === path) {
            const rest = tabs.filter((t) => t.path !== path);
            setActive(rest.length ? rest[rest.length - 1].path : null);
        }
    };

    const newFile = async (asDir: boolean, baseNode: FileNode | null) => {
        setCtx(null);
        const baseDir = baseNode ? (baseNode.type === 'dir' ? baseNode.path : baseNode.path.split('/').slice(0, -1).join('/')) : '';
        const name = await prompt({
            title: asDir ? 'New folder' : 'New file',
            label: 'Path',
            placeholder: asDir ? 'src/components' : 'src/index.ts',
            helperText: baseDir ? `Created under ${baseDir}/` : 'Relative to the workspace root.',
            confirmText: 'Create',
        });
        if (!name) return;
        const full = baseDir ? `${baseDir}/${name}` : name;
        try {
            await api.createFile(tgt, { path: full, dir: asDir });
            await loadTree();
            if (!asDir) openFile({ name: name.split('/').pop()!, path: full, type: 'file' });
        } catch (e) {
            notify((e as Error).message, 'error');
        }
    };

    const rename = async (node: FileNode) => {
        setCtx(null);
        const to = await prompt({ title: 'Rename / move', label: 'New path', defaultValue: node.path, confirmText: 'Rename' });
        if (!to || to === node.path) return;
        try {
            await api.renameFile(tgt, { from: node.path, to });
            closeTab(node.path);
            await loadTree();
            notify('Renamed', 'success');
        } catch (e) {
            notify((e as Error).message, 'error');
        }
    };

    const del = async (node: FileNode) => {
        setCtx(null);
        const ok = await confirm({ title: 'Delete', message: `Delete ${node.path}? This cannot be undone.`, confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await api.deleteFile(tgt, { path: node.path });
            closeTab(node.path);
            await loadTree();
            notify('Deleted', 'info');
        } catch (e) {
            notify((e as Error).message, 'error');
        }
    };

    return (
        <Box sx={{ display: 'flex', height: '100%', minHeight: 0 }}>
            {/* File explorer pane */}
            <Box sx={{ width: 260, flexShrink: 0, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5 }}>
                    <Typography variant="caption" sx={{ flex: 1, textTransform: 'uppercase', letterSpacing: '.06em', color: 'text.secondary', pl: 1 }}>
                        Explorer
                    </Typography>
                    <Tooltip title="New file">
                        <IconButton size="small" onClick={() => newFile(false, null)}><NoteAddOutlinedIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="New folder">
                        <IconButton size="small" onClick={() => newFile(true, null)}><CreateNewFolderOutlinedIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Refresh">
                        <IconButton size="small" onClick={loadTree}><RefreshIcon fontSize="small" /></IconButton>
                    </Tooltip>
                </Stack>
                <Divider />
                <Box sx={{ overflow: 'auto', flex: 1, py: 0.5 }}>
                    <FileTree
                        nodes={tree}
                        activePath={active}
                        onOpenFile={openFile}
                        onContext={(e, node) => {
                            e.preventDefault();
                            setCtx({ x: e.clientX, y: e.clientY, node });
                        }}
                    />
                </Box>
            </Box>

            {/* Editor pane */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Stack direction="row" alignItems="center" sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40, overflow: 'auto' }}>
                    {tabs.map((t) => (
                        <Box
                            key={t.path}
                            onClick={() => setActive(t.path)}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 1, cursor: 'pointer',
                                borderRight: 1, borderColor: 'divider', whiteSpace: 'nowrap',
                                bgcolor: active === t.path ? 'background.default' : 'transparent',
                                borderBottom: active === t.path ? 2 : 0, borderBottomColor: 'primary.main',
                            }}
                        >
                            <Typography variant="body2" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                                {t.content !== t.saved ? '● ' : ''}{t.name}
                            </Typography>
                            <IconButton size="small" sx={{ p: 0.25 }} onClick={(e) => { e.stopPropagation(); closeTab(t.path); }}>
                                <CloseIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Box>
                    ))}
                    <Box sx={{ flex: 1 }} />
                    {current && (
                        <Stack direction="row" sx={{ px: 1 }}>
                            <Tooltip title="Rename"><span><IconButton size="small" onClick={() => rename({ name: current.name, path: current.path, type: 'file' })}><DriveFileRenameOutlineIcon fontSize="small" /></IconButton></span></Tooltip>
                            <Tooltip title="Delete"><span><IconButton size="small" onClick={() => del({ name: current.name, path: current.path, type: 'file' })}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>
                            <Tooltip title="Save (Ctrl+S)"><span><IconButton size="small" disabled={!dirty} onClick={save}><SaveIcon fontSize="small" /></IconButton></span></Tooltip>
                        </Stack>
                    )}
                </Stack>

                <Box sx={{ flex: 1, minHeight: 0 }}>
                    {!current ? (
                        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                            <Typography variant="body2">Select a file from the explorer to edit.</Typography>
                        </Box>
                    ) : current.binary ? (
                        <Box sx={{ p: 3, color: 'text.secondary' }}>Binary file — not editable.</Box>
                    ) : (
                        <Editor
                            theme="vs-dark"
                            path={`${targetKey}/${current.path}`}
                            language={langOf(current.path)}
                            value={current.content}
                            onChange={(v) =>
                                setTabs((ts) => ts.map((t) => (t.path === current.path ? { ...t, content: v ?? '' } : t)))
                            }
                            options={{ fontSize: 13, minimap: { enabled: false }, tabSize: 2, automaticLayout: true, scrollBeyondLastLine: false }}
                        />
                    )}
                </Box>
            </Box>

            <Menu
                open={!!ctx}
                onClose={() => setCtx(null)}
                anchorReference="anchorPosition"
                anchorPosition={ctx ? { top: ctx.y, left: ctx.x } : undefined}
            >
                <MenuItem onClick={() => newFile(false, ctx?.node ?? null)}>New file…</MenuItem>
                <MenuItem onClick={() => newFile(true, ctx?.node ?? null)}>New folder…</MenuItem>
                {ctx?.node && <Divider />}
                {ctx?.node && <MenuItem onClick={() => rename(ctx.node!)}>Rename / move…</MenuItem>}
                {ctx?.node && <MenuItem onClick={() => del(ctx.node!)} sx={{ color: 'error.main' }}>Delete</MenuItem>}
            </Menu>
        </Box>
    );
}
