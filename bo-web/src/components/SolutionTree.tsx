import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import StorageIcon from '@mui/icons-material/Storage';
import WidgetsOutlinedIcon from '@mui/icons-material/WidgetsOutlined';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import { api, type FileNode, type Template } from '../api';

type Notify = (msg: string, sev?: 'success' | 'error' | 'info') => void;

interface Props {
    dirs: string[];
    templates: Template[];
    selected: string | null;
    onSelectTemplate: (name: string) => void;
    onOpenFile: (templateName: string, file: FileNode) => void;
    onTemplateContext: (e: React.MouseEvent, name: string) => void;
    notify: Notify;
}

const sep = (p: string) => (p.includes('\\') ? '\\' : '/');
const isUnder = (child: string, parent: string) => child === parent || child.startsWith(parent + sep(parent));

/* --------------------------------- files -------------------------------- */

function FileRow({ node, depth, templateName, onOpenFile }: { node: FileNode; depth: number; templateName: string; onOpenFile: Props['onOpenFile'] }) {
    const [open, setOpen] = useState(false);
    const isDir = node.type === 'dir';
    return (
        <>
            <ListItemButton dense onClick={() => (isDir ? setOpen((o) => !o) : onOpenFile(templateName, node))} sx={{ pl: 1 + depth * 1.25, py: 0.1 }}>
                <ListItemIcon sx={{ minWidth: 20, color: 'text.secondary' }}>
                    {isDir ? (open ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ChevronRightIcon sx={{ fontSize: 16 }} />) : <DescriptionOutlinedIcon sx={{ fontSize: 15 }} />}
                </ListItemIcon>
                {isDir && <ListItemIcon sx={{ minWidth: 20, color: 'primary.main' }}><FolderOutlinedIcon sx={{ fontSize: 15 }} /></ListItemIcon>}
                <ListItemText primary={node.name} primaryTypographyProps={{ noWrap: true, fontSize: 12, fontFamily: 'ui-monospace, monospace' }} />
            </ListItemButton>
            {isDir && (
                <Collapse in={open} unmountOnExit>
                    {(node.children ?? []).map((c) => <FileRow key={c.path} node={c} depth={depth + 1} templateName={templateName} onOpenFile={onOpenFile} />)}
                </Collapse>
            )}
        </>
    );
}

/* ------------------------------- projects ------------------------------- */

function ProjectRow({ template, selected, depth, onSelectTemplate, onOpenFile, onTemplateContext, notify }:
    { template: Template; selected: boolean; depth: number } & Pick<Props, 'onSelectTemplate' | 'onOpenFile' | 'onTemplateContext' | 'notify'>) {
    const [open, setOpen] = useState(false);
    const [tree, setTree] = useState<FileNode[] | null>(null);

    const load = useCallback(() => {
        api.files({ template: template.name }).then((r) => setTree(r.tree)).catch((e) => notify((e as Error).message, 'error'));
    }, [template.name, notify]);

    // Refresh files when expanded (and when the template identity changes).
    useEffect(() => { if (open) load(); }, [open, load]);

    return (
        <>
            <ListItemButton
                dense selected={selected}
                onClick={() => { onSelectTemplate(template.name); setOpen(true); }}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onTemplateContext(e, template.name); }}
                sx={{ pl: 1 + depth * 1.25, py: 0.25 }}
            >
                <ListItemIcon sx={{ minWidth: 22 }} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
                    {open ? <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> : <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
                </ListItemIcon>
                <ListItemIcon sx={{ minWidth: 24, color: 'secondary.main' }}><WidgetsOutlinedIcon sx={{ fontSize: 17 }} /></ListItemIcon>
                <ListItemText primary={template.shortName} secondary={template.title !== template.shortName ? template.title : undefined}
                    primaryTypographyProps={{ noWrap: true, fontSize: 12.5, fontWeight: 600 }}
                    secondaryTypographyProps={{ noWrap: true, fontSize: 10 }} />
            </ListItemButton>
            <Collapse in={open} unmountOnExit>
                {tree === null
                    ? <Typography variant="caption" color="text.secondary" sx={{ pl: 1 + (depth + 1) * 1.25, py: 0.25, display: 'block' }}>Loading…</Typography>
                    : tree.map((n) => <FileRow key={n.path} node={n} depth={depth + 1} templateName={template.name} onOpenFile={onOpenFile} />)}
            </Collapse>
        </>
    );
}

/* ------------------------------- container ------------------------------ */

function ContainerRow({ dir, templates, ...rest }: { dir: string; templates: Template[] } & Pick<Props, 'selected' | 'onSelectTemplate' | 'onOpenFile' | 'onTemplateContext' | 'notify'>) {
    const [open, setOpen] = useState(true);
    const label = dir.split(/[\\/]/).filter(Boolean).pop() || dir;
    return (
        <>
            <ListItemButton dense onClick={() => setOpen((o) => !o)} sx={{ py: 0.25 }} title={dir}>
                <ListItemIcon sx={{ minWidth: 22 }}>{open ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ChevronRightIcon sx={{ fontSize: 16 }} />}</ListItemIcon>
                <ListItemIcon sx={{ minWidth: 24, color: 'text.secondary' }}><StorageIcon sx={{ fontSize: 16 }} /></ListItemIcon>
                <ListItemText primary={label} primaryTypographyProps={{ noWrap: true, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }} />
            </ListItemButton>
            <Collapse in={open} unmountOnExit>
                {templates.length === 0
                    ? <Typography variant="caption" color="text.secondary" sx={{ pl: 4, py: 0.5, display: 'block' }}>No templates here.</Typography>
                    : templates.map((t) => (
                        <ProjectRow key={t.name} template={t} depth={1} selected={rest.selected === t.name}
                            onSelectTemplate={rest.onSelectTemplate} onOpenFile={rest.onOpenFile} onTemplateContext={rest.onTemplateContext} notify={rest.notify} />
                    ))}
            </Collapse>
        </>
    );
}

export function SolutionTree({ dirs, templates, ...rest }: Props) {
    // Group each template under the longest registered dir that contains it.
    const containerOf = (t: Template) => {
        const matches = dirs.filter((d) => isUnder(t.dir, d)).sort((a, b) => b.length - a.length);
        return matches[0] ?? dirs[0] ?? t.dir;
    };
    const groups = new Map<string, Template[]>();
    for (const d of dirs) groups.set(d, []);
    for (const t of templates) {
        const c = containerOf(t);
        groups.set(c, [...(groups.get(c) ?? []), t]);
    }
    // Only show containers that actually hold templates.
    const shown = [...groups.entries()].filter(([, ts]) => ts.length > 0);

    if (templates.length === 0) {
        return <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>No templates yet.</Typography>;
    }
    return (
        <Box>
            {shown.map(([dir, ts]) => <ContainerRow key={dir} dir={dir} templates={ts} {...rest} />)}
        </Box>
    );
}
