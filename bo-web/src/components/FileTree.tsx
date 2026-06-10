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

interface Props {
    nodes: FileNode[];
    activePath: string | null;
    onOpenFile: (node: FileNode) => void;
    onContext: (e: React.MouseEvent, node: FileNode | null) => void;
    depth?: number;
}

function Row({ node, activePath, onOpenFile, onContext, depth = 0 }: { node: FileNode } & Omit<Props, 'nodes'>) {
    const [open, setOpen] = useState(depth < 1);
    const isDir = node.type === 'dir';
    const active = node.path === activePath;

    return (
        <>
            <ListItemButton
                dense
                selected={active}
                onClick={() => (isDir ? setOpen((o) => !o) : onOpenFile(node))}
                onContextMenu={(e) => onContext(e, node)}
                sx={{ pl: 1 + depth * 1.5, py: 0.25, borderRadius: 1 }}
            >
                <ListItemIcon sx={{ minWidth: 26, color: 'text.secondary' }}>
                    {isDir ? (
                        open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />
                    ) : (
                        <DescriptionOutlinedIcon fontSize="small" />
                    )}
                </ListItemIcon>
                {isDir && (
                    <ListItemIcon sx={{ minWidth: 26, color: 'primary.main' }}>
                        <FolderOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                )}
                <ListItemText
                    primary={node.name}
                    primaryTypographyProps={{ noWrap: true, fontSize: 13, fontFamily: 'ui-monospace, monospace' }}
                />
            </ListItemButton>
            {isDir && (
                <Collapse in={open} unmountOnExit>
                    {(node.children ?? []).map((c) => (
                        <Row
                            key={c.path}
                            node={c}
                            activePath={activePath}
                            onOpenFile={onOpenFile}
                            onContext={onContext}
                            depth={depth + 1}
                        />
                    ))}
                </Collapse>
            )}
        </>
    );
}

export function FileTree({ nodes, activePath, onOpenFile, onContext }: Props) {
    if (!nodes.length) return <Box sx={{ p: 2, color: 'text.secondary', fontSize: 13 }}>Empty template.</Box>;
    return (
        <Box onContextMenu={(e) => onContext(e, null)}>
            {nodes.map((n) => (
                <Row key={n.path} node={n} activePath={activePath} onOpenFile={onOpenFile} onContext={onContext} />
            ))}
        </Box>
    );
}
