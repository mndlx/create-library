import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useState, type ReactNode } from 'react';

/**
 * Building blocks for dense detail / inspector panels (UE5-style property rows).
 *
 * House style: flat collapsible Sections (small overline header + optional
 * description), divider-separated. Inside, Fields are tight rows — a small
 * label in a left column, the control filling the value column on the right.
 * Controls are the compact filled PanelInput/PanelSelect. Toggles use Switch.
 */

const LABEL_COL = 104;

const inputSx = {
    '& .MuiFilledInput-root': {
        borderRadius: '5px',
        backgroundColor: alpha('#000', 0.25),
        border: '1px solid',
        borderColor: 'divider',
        minHeight: 0,
        transition: 'border-color .12s, background-color .12s',
        '&:hover': { backgroundColor: alpha('#000', 0.3) },
        '&.Mui-focused': { borderColor: 'primary.main', backgroundColor: alpha('#000', 0.3) },
    },
    '& .MuiFilledInput-input': { padding: '3px 8px', fontSize: 12, lineHeight: '18px', height: 'auto' },
    '& textarea.MuiFilledInput-input': { padding: '3px 8px' },
    '& .MuiSelect-icon': { fontSize: 18, right: 4 },
    '& .MuiSelect-select.MuiFilledInput-input': { paddingRight: '24px' },
    '& .MuiInputAdornment-root': { marginTop: '0 !important' },
    '& .MuiInputAdornment-root .MuiTypography-root': { fontSize: 11 },
};

/** Compact filled input used across the inspector. */
export function PanelInput({ sx, InputProps, ...props }: TextFieldProps) {
    return (
        <TextField
            variant="filled" hiddenLabel size="small"
            InputProps={{ disableUnderline: true, ...InputProps }}
            sx={{ ...inputSx, ...sx } as TextFieldProps['sx']}
            {...props}
        />
    );
}

export function PanelSelect({ value, onChange, options, sx, fullWidth }: {
    value: string; onChange: (v: string) => void;
    options: { value: string; label?: ReactNode }[]; sx?: TextFieldProps['sx']; fullWidth?: boolean;
}) {
    return (
        <PanelInput select fullWidth={fullWidth} value={value} onChange={(e) => onChange(e.target.value)} sx={sx}>
            {options.map((o) => <MenuItem key={o.value} value={o.value} sx={{ fontSize: 12, minHeight: 28 }}>{o.label ?? o.value}</MenuItem>)}
        </PanelInput>
    );
}

/** A collapsible panel section: small overline header, optional description + action. */
export function Section({ title, description, action, defaultOpen = true, children }: {
    title: string; description?: ReactNode; action?: ReactNode; defaultOpen?: boolean; children: ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <Box sx={{ px: 1.5, py: 1 }}>
            <Stack
                direction="row" alignItems="center" spacing={0.5}
                onClick={() => setOpen((o) => !o)}
                sx={{ cursor: 'pointer', userSelect: 'none', minHeight: 20, '&:hover .secLabel': { color: 'text.primary' } }}
            >
                <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary', transition: 'transform .12s', transform: open ? 'none' : 'rotate(-90deg)' }} />
                <Typography className="secLabel" variant="overline" color="text.secondary" sx={{ flex: 1, fontSize: 10, lineHeight: 1.2, transition: 'color .12s' }}>
                    {title}
                </Typography>
                {action && <Box onClick={(e) => e.stopPropagation()}>{action}</Box>}
            </Stack>
            <Collapse in={open} unmountOnExit>
                <Box sx={{ pt: 0.75, pl: 0.25 }}>
                    {description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontSize: 11, lineHeight: 1.4 }}>{description}</Typography>
                    )}
                    <Stack spacing={0.75}>{children}</Stack>
                </Box>
            </Collapse>
        </Box>
    );
}

/** Property row: small left label column, control fills the value column. */
export function Field({ label, hint, control, labelWidth = LABEL_COL, align = 'center' }: {
    label: ReactNode; hint?: ReactNode; control: ReactNode; labelWidth?: number; align?: 'center' | 'start';
}) {
    return (
        <Stack direction="row" alignItems={align === 'start' ? 'flex-start' : 'center'} spacing={1} sx={{ minHeight: 26 }}>
            <Box sx={{ width: labelWidth, flexShrink: 0, pt: align === 'start' ? '4px' : 0 }}>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 11.5, lineHeight: 1.3 }} title={typeof label === 'string' ? label : undefined}>{label}</Typography>
                {hint && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: 10 }}>{hint}</Typography>}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>{control}</Box>
        </Stack>
    );
}

/** Stacked row: a tiny caption label above a full-width control (for wide values). */
export function StackedField({ label, hint, children }: { label?: ReactNode; hint?: ReactNode; children: ReactNode }) {
    return (
        <Box>
            {label && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, fontSize: 11 }}>{label}</Typography>}
            {children}
            {hint && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: 10 }}>{hint}</Typography>}
        </Box>
    );
}

/** Inline label + switch. */
export function SwitchField({ label, hint, checked, onChange }: {
    label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void;
}) {
    return <Field label={label} hint={hint} labelWidth={180} control={<Switch size="small" checked={checked} onChange={(e) => onChange(e.target.checked)} />} />;
}
