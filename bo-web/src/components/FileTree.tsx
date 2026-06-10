import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { useState } from 'react';
import type { FileNode } from '../api';

interface TreeProps {
    nodes: FileNode[];
    selectedPath: string | null;
    onSelect: (node: FileNode) => void;
    onContext: (e: React.MouseEvent, node: FileNode | null) => void;
    onMove: (srcPath: string, destDir: string) => void;
}

interface RowProps extends Omit<TreeProps, 'nodes'> {
    node: FileNode;
    depth: number;
    dragOver: string | null;
    setDragOver: (p: string | null) => void;
}

function Row({ node, depth, selectedPath, onSelect, onContext, onMove, dragOver, setDragOver }: RowProps) {
    const [open, setOpen] = useState(depth < 1);
    const isDir = node.type === 'dir';
    const selected = node.path === selectedPath;
    const dropTarget = isDir ? node.path : node.path.split('/').slice(0, -1).join('/');

    return (
        <>
            <ListItemButton
                dense
                selected={selected}
                draggable
                onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData('text/plain', node.path); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setDragOver(dropTarget); }}
                onDragLeave={(e) => { e.stopPropagation(); }}
                onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    const src = e.dataTransfer.getData('text/plain');
                    setDragOver(null);
                    if (src) onMove(src, dropTarget);
                }}
                onClick={() => { if (isDir) setOpen((o) => !o); onSelect(node); }}
                onContextMenu={(e) => onContext(e, node)}
                sx={{
                    pl: 1 + depth * 1.5, py: 0.25, borderRadius: 1,
                    bgcolor: dragOver === node.path && isDir ? 'action.hover' : undefined,
                    outline: dragOver === node.path && isDir ? '1px dashed' : 'none',
                    outlineColor: 'primary.main',
                }}
            >
                <ListItemIcon sx={{ minWidth: 26, color: 'text.secondary' }}>
                    {isDir ? (open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />) : <DescriptionOutlinedIcon fontSize="small" />}
                </ListItemIcon>
                {isDir && (
                    <ListItemIcon sx={{ minWidth: 26, color: 'primary.main' }}><FolderOutlinedIcon fontSize="small" /></ListItemIcon>
                )}
                <ListItemText primary={node.name} primaryTypographyProps={{ noWrap: true, fontSize: 13, fontFamily: 'ui-monospace, monospace' }} />
            </ListItemButton>
            {isDir && (
                <Collapse in={open} unmountOnExit>
                    {(node.children ?? []).map((c) => (
                        <Row key={c.path} node={c} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} onContext={onContext} onMove={onMove} dragOver={dragOver} setDragOver={setDragOver} />
                    ))}
                </Collapse>
            )}
        </>
    );
}

export function FileTree({ nodes, selectedPath, onSelect, onContext, onMove }: TreeProps) {
    const [dragOver, setDragOver] = useState<string | null>(null);
    return (
        <Box
            onContextMenu={(e) => onContext(e, null)}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(''); }}
            onDrop={(e) => {
                e.preventDefault();
                const src = e.dataTransfer.getData('text/plain');
                setDragOver(null);
                if (src) onMove(src, ''); // drop on empty area → move to root
            }}
            sx={{ minHeight: '100%', outline: dragOver === '' ? '1px dashed' : 'none', outlineColor: 'primary.main' }}
        >
            {nodes.length === 0 ? (
                <Box sx={{ p: 2, color: 'text.secondary', fontSize: 13 }}>Empty — right-click to add a file.</Box>
            ) : (
                nodes.map((n) => (
                    <Row key={n.path} node={n} depth={0} selectedPath={selectedPath} onSelect={onSelect} onContext={onContext} onMove={onMove} dragOver={dragOver} setDragOver={setDragOver} />
                ))
            )}
        </Box>
    );
}
