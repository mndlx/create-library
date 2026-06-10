import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface PromptOpts {
    title: string;
    label?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    helperText?: string;
}
interface ConfirmOpts {
    title: string;
    message?: string;
    confirmText?: string;
    danger?: boolean;
}

interface DialogApi {
    prompt: (o: PromptOpts) => Promise<string | null>;
    confirm: (o: ConfirmOpts) => Promise<boolean>;
}

const DialogContext = createContext<DialogApi | null>(null);

export const useDialogs = (): DialogApi => {
    const ctx = useContext(DialogContext);
    if (!ctx) throw new Error('useDialogs must be used within <DialogProvider>');
    return ctx;
};

interface PromptState extends PromptOpts {
    value: string;
    resolve: (v: string | null) => void;
}
interface ConfirmState extends ConfirmOpts {
    resolve: (v: boolean) => void;
}

export function DialogProvider({ children }: { children: ReactNode }) {
    const [p, setP] = useState<PromptState | null>(null);
    const [c, setC] = useState<ConfirmState | null>(null);

    const prompt = useCallback(
        (o: PromptOpts) =>
            new Promise<string | null>((resolve) => setP({ ...o, value: o.defaultValue ?? '', resolve })),
        []
    );
    const confirm = useCallback(
        (o: ConfirmOpts) => new Promise<boolean>((resolve) => setC({ ...o, resolve })),
        []
    );

    const closePrompt = (v: string | null) => {
        p?.resolve(v);
        setP(null);
    };
    const closeConfirm = (v: boolean) => {
        c?.resolve(v);
        setC(null);
    };

    return (
        <DialogContext.Provider value={{ prompt, confirm }}>
            {children}

            <Dialog open={!!p} onClose={() => closePrompt(null)} maxWidth="sm" fullWidth>
                <DialogTitle>{p?.title}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        margin="dense"
                        size="small"
                        label={p?.label}
                        placeholder={p?.placeholder}
                        helperText={p?.helperText}
                        value={p?.value ?? ''}
                        onChange={(e) => setP((s) => (s ? { ...s, value: e.target.value } : s))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); closePrompt(p?.value ?? ''); }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => closePrompt(null)}>Cancel</Button>
                    <Button variant="contained" onClick={() => closePrompt(p?.value ?? '')}>{p?.confirmText ?? 'OK'}</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={!!c} onClose={() => closeConfirm(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{c?.title}</DialogTitle>
                {c?.message && (
                    <DialogContent>
                        <DialogContentText>{c.message}</DialogContentText>
                    </DialogContent>
                )}
                <DialogActions>
                    <Button onClick={() => closeConfirm(false)}>Cancel</Button>
                    <Button variant="contained" color={c?.danger ? 'error' : 'primary'} onClick={() => closeConfirm(true)}>
                        {c?.confirmText ?? 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>
        </DialogContext.Provider>
    );
}
