import FileDownloadIcon from '@mui/icons-material/FileDownload';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { api, type Template } from '../api';

interface Props {
    open: boolean;
    templateName: string | null;
    onClose: () => void;
    notify: (msg: string, sev?: 'success' | 'error' | 'info') => void;
}

/**
 * Export = generate from the latest PUBLISHED version of the template with
 * user-entered values and download the result as a zip (same engine output
 * the CLI produces).
 */
export function ExportDialog({ open, templateName, onClose, notify }: Props) {
    const [published, setPublished] = useState<Template | null>(null);
    const [loading, setLoading] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [features, setFeatures] = useState<Record<string, boolean | string>>({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open || !templateName) return;
        setLoading(true);
        setPublished(null);
        api.publishedTemplate(templateName)
            .then(({ published: p }) => {
                setPublished(p);
                if (p) {
                    setAnswers(Object.fromEntries(p.variables.map((v) => [v.name, v.default ?? ''])));
                    setFeatures(Object.fromEntries(p.features.map((f) => [f.id, f.default ?? (f.type === 'boolean' ? false : '')])));
                }
            })
            .catch((e) => notify((e as Error).message, 'error'))
            .finally(() => setLoading(false));
    }, [open, templateName, notify]);

    const doExport = async () => {
        if (!templateName) return;
        setBusy(true);
        try {
            const { blob, filename } = await api.exportZip({ templateName, answers, features });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            notify(`Exported ${filename}`, 'success');
            onClose();
        } catch (e) {
            notify((e as Error).message, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Stack direction="row" spacing={1} alignItems="center">
                    <span>Export {templateName}</span>
                    {published && <Chip size="small" label={`v${published.version}`} color="secondary" variant="outlined" />}
                    <Chip size="small" label="published snapshot" variant="outlined" sx={{ height: 20 }} />
                </Stack>
            </DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
                ) : !published ? (
                    <Alert severity="warning">
                        No published version of this template. Publish one first (right panel → Publish to registry).
                    </Alert>
                ) : (
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            Fill the variables — every {published.tokenConfig.start}token{published.tokenConfig.end} in
                            the published files is replaced with your values, and the result is downloaded as a zip.
                        </Typography>
                        {published.variables.map((v) => (
                            v.type === 'select' ? (
                                <TextField key={v.name} select fullWidth size="small" label={v.message} value={answers[v.name] ?? ''}
                                    onChange={(e) => setAnswers((a) => ({ ...a, [v.name]: e.target.value }))}>
                                    {(v.options ?? []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                                </TextField>
                            ) : (
                                <TextField key={v.name} fullWidth size="small"
                                    label={`${v.message} (${published.tokenConfig.start}${v.token}${published.tokenConfig.end})`}
                                    value={answers[v.name] ?? ''}
                                    onChange={(e) => setAnswers((a) => ({ ...a, [v.name]: e.target.value }))} />
                            )
                        ))}
                        {published.features.length > 0 && (
                            <Typography variant="caption" color="text.secondary">Features</Typography>
                        )}
                        {published.features.map((f) => (
                            <Stack key={f.id} direction="row" alignItems="center" justifyContent="space-between">
                                <Typography variant="body2">{f.label}</Typography>
                                {f.type === 'select' ? (
                                    <TextField select size="small" sx={{ width: 140 }} value={(features[f.id] as string) ?? ''}
                                        onChange={(e) => setFeatures((s) => ({ ...s, [f.id]: e.target.value }))}>
                                        {(f.options ?? []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                                    </TextField>
                                ) : (
                                    <Checkbox size="small" checked={!!features[f.id]}
                                        onChange={(e) => setFeatures((s) => ({ ...s, [f.id]: e.target.checked }))} />
                                )}
                            </Stack>
                        ))}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" startIcon={busy ? <CircularProgress size={16} /> : <FileDownloadIcon />}
                    disabled={!published || busy} onClick={doExport}>
                    Export zip
                </Button>
            </DialogActions>
        </Dialog>
    );
}
