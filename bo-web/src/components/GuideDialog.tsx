import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

function Code({ children, lang }: { children: string; lang?: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            /* clipboard blocked — ignore */
        }
    };
    return (
        <Box sx={{ position: 'relative', my: 1 }}>
            {lang && (
                <Chip size="small" label={lang} sx={{ position: 'absolute', top: 6, right: 40, height: 18, fontSize: 10 }} variant="outlined" />
            )}
            <Tooltip title={copied ? 'Copied' : 'Copy'}>
                <IconButton size="small" onClick={copy} sx={{ position: 'absolute', top: 2, right: 4 }}>
                    <ContentCopyIcon sx={{ fontSize: 15 }} />
                </IconButton>
            </Tooltip>
            <Box
                component="pre"
                sx={{
                    bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 1,
                    p: 1.5, pr: 6, m: 0, overflow: 'auto', fontSize: 12.5, lineHeight: 1.5,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <Box sx={{ mb: 2.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: '#04121c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{n}</Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
            </Stack>
            <Box sx={{ pl: 4.5 }}>{children}</Box>
        </Box>
    );
}

const TODO_TSX = `import { useState } from 'react';

export interface TodoProps {
  title?: string;
}

export function Todo({ title = 'To-Do' }: TodoProps) {
  const [items, setItems] = useState<string[]>([]);
  const [text, setText] = useState('');

  const add = () => {
    if (!text.trim()) return;
    setItems([...items, text.trim()]);
    setText('');
  };

  return (
    <div>
      <h3>{title}</h3>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={add}>Add</button>
      <ul>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}`;

const TODO_INDEX = `export * from './Todo';`;

const IMPORT_USAGE = `import { Todo } from './components/Todo';

export function App() {
  return <Todo title="My tasks" />;
}`;

interface Props {
    open: boolean;
    onClose: () => void;
    onNewTemplate: () => void;
}

export function GuideDialog({ open, onClose, onNewTemplate }: Props) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle>How to use the back-office</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    A <b>template</b> is a folder of files you can reuse. The engine copies those files into a new
                    project (<Chip size="small" label="new" color="secondary" variant="outlined" sx={{ height: 18 }} />)
                    or merges them into an existing one (<Chip size="small" label="merge" color="warning" variant="outlined" sx={{ height: 18 }} />),
                    replacing <code>__TOKEN__</code> placeholders with answers you give at generation time. Files live
                    under the template's <code>template/</code> folder; optional parts live as <b>features</b>.
                </Typography>

                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" sx={{ mb: 1.5 }}>Walkthrough — a Todo component you can import</Typography>

                <Step n={1} title="Create the template">
                    <Typography variant="body2">
                        Click <b>New template</b> (top bar). Name it <code>todo-component</code>, set <b>Output mode</b> to
                        <b> merge</b> (it adds files into an existing app). Create.
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => { onClose(); onNewTemplate(); }} sx={{ mt: 1 }}>
                        New template…
                    </Button>
                </Step>

                <Step n={2} title="Add the component files">
                    <Typography variant="body2">
                        Go to the <b>Editor</b> tab. In the Explorer use <b>New file</b> to create
                        {' '}<code>template/src/components/Todo/Todo.tsx</code> and paste:
                    </Typography>
                    <Code lang="Todo.tsx">{TODO_TSX}</Code>
                    <Typography variant="body2">Then create <code>template/src/components/Todo/index.ts</code>:</Typography>
                    <Code lang="index.ts">{TODO_INDEX}</Code>
                    <Typography variant="caption" color="text.secondary">
                        Press Ctrl+S to save each file. Tip: put <code>__NAME__</code> anywhere in a file and it becomes a
                        variable you can fill in at generation time.
                    </Typography>
                </Step>

                <Step n={3} title="(Optional) make the default title a variable">
                    <Typography variant="body2">
                        In <b>Author</b> → <i>Add a variable</i>: name <code>todoTitle</code>, token <code>TODOTITLE</code>,
                        default <code>To-Do</code>. Then in <code>Todo.tsx</code> replace the default with
                        {' '}<code>__TODOTITLE__</code> — generation substitutes your answer.
                    </Typography>
                </Step>

                <Step n={4} title="Generate / merge into your app">
                    <Typography variant="body2">
                        Open the <b>Generate</b> tab, set <b>Mode</b> = <b>merge</b>, and <b>Target directory</b> to your
                        existing React project (e.g. <code>C:\\dev\\my-app</code>). Click <b>Generate</b>. The component
                        files are written under your app's <code>src/components/Todo/</code>.
                    </Typography>
                </Step>

                <Step n={5} title="Import and use it">
                    <Typography variant="body2">In your app:</Typography>
                    <Code lang="App.tsx">{IMPORT_USAGE}</Code>
                </Step>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Cheat sheet</Typography>
                <Typography variant="body2" component="div">
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li><b>New template</b> — top bar / drawer “+”.</li>
                        <li><b>Editor</b> — create & edit the template's files (VSCode-style).</li>
                        <li><b>Author</b> — add variables (<code>__TOKEN__</code>) and components.</li>
                        <li><b>Generate</b> — produce a new project, or merge into an existing one.</li>
                        <li><b>Open folder…</b> — edit any directory directly, no manifest needed.</li>
                        <li><b>Payload layout</b> — a template can keep files in a <code>template/</code> subfolder, or flat at its root. For flat templates the <code>template.json</code> is left out of the output unless you tick “Include manifest files” in Generate.</li>
                    </ul>
                </Typography>
            </DialogContent>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={onClose}>Got it</Button>
            </Box>
        </Dialog>
    );
}
