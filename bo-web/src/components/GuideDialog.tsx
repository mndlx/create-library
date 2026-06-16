import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'primary.main', color: '#06121f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{n}</Box>
                <Typography variant="subtitle2">{title}</Typography>
            </Stack>
            <Box sx={{ pl: 4 }}>{children}</Box>
        </Box>
    );
}

export function GuideDialog({ open, onClose, onNewTemplate }: { open: boolean; onClose: () => void; onNewTemplate: () => void }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
            <DialogTitle>How to use the back-office</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This is a front-end for the standard <b>dotnet new</b> template engine. A template is a folder with a
                    {' '}<code>.template.config/template.json</code>; its <b>parameters</b> are the manifest's <code>symbols</code>.
                    Generation runs <code>dotnet new &lt;shortName&gt;</code> — output is exactly what the .NET CLI produces.
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Step n={1} title="Create or open a template">
                    <Typography variant="body2">
                        <b>New template</b> scaffolds a <code>.template.config</code> skeleton. Or register a folder that
                        already holds <code>dotnet new</code> templates with <b>Open folder…</b> → it appears in the Solution tree.
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => { onClose(); onNewTemplate(); }} sx={{ mt: 1 }}>New template…</Button>
                </Step>

                <Step n={2} title="Edit files">
                    <Typography variant="body2">
                        Expand a project in the <b>Solution</b> tree (left) and click a file to edit it. Put the
                        {' '}<i>sourceName</i> (e.g. <code>MyProject</code>) in file names and code — <code>dotnet new -n</code> renames it.
                        Put a literal token wherever a parameter should substitute.
                    </Typography>
                </Step>

                <Step n={3} title="Define parameters">
                    <Typography variant="body2">
                        In the right panel’s <b>Parameters</b> tab add symbols. Each has a <b>datatype</b>
                        {' '}(string / bool / choice), a default, and <b>Replaces</b> — the literal token in the files that the
                        value substitutes. Edits auto-save to <code>template.json</code>.
                    </Typography>
                </Step>

                <Step n={4} title="Generate">
                    <Typography variant="body2">
                        In <b>Generate</b>, set the <b>Name (-n)</b> and the parameter values, pick a <b>Target folder</b>,
                        and run. It executes <code>dotnet new install → dotnet new … → uninstall</code> and writes the project there.
                    </Typography>
                </Step>

                <Typography variant="caption" color="text.secondary">Requires the .NET SDK on PATH (<code>dotnet</code>).</Typography>
            </DialogContent>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={onClose}>Got it</Button>
            </Box>
        </Dialog>
    );
}
