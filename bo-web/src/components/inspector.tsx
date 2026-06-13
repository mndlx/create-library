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
 * Shared building blocks for detail / inspector panels.
 *
 * The house style: flat collapsible Sections (overline header + optional
 * description), separated by dividers; inside, Fields are compact rows with the
 * label on the left and a control on the right, or StackedFields for wide
 * inputs. Controls use the filled PanelInput so every panel reads the same.
 */

const inputSx = {
    '& .MuiFilledInput-root': {
        borderRadius: 1.5,
        backgroundColor: alpha('#000', 0.22),
        border: '1px solid',
        borderColor: 'divider',
        transition: 'border-color .15s, background-color .15s',
        '&:hover': { backgroundColor: alpha('#000', 0.28) },
        '&.Mui-focused': { borderColor: 'primary.main', backgroundColor: alpha('#000', 0.28) },
    },
    '& .MuiFilledInput-input': { paddingTop: '7px', paddingBottom: '7px', paddingInline: '10px', fontSize: 13 },
    '& textarea.MuiFilledInput-input': { paddingInline: 0 },
    '& .MuiInputAdornment-root': { marginTop: '0 !important' },
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
            {options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label ?? o.value}</MenuItem>)}
        </PanelInput>
    );
}

/** A collapsible panel section: overline header, optional description + action. */
export function Section({ title, description, action, defaultOpen = true, children }: {
    title: string; description?: ReactNode; action?: ReactNode; defaultOpen?: boolean; children: ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <Box sx={{ px: 2, py: 1.5 }}>
            <Stack
                direction="row" alignItems="center" spacing={1}
                onClick={() => setOpen((o) => !o)}
                sx={{ cursor: 'pointer', userSelect: 'none', minHeight: 24, '&:hover .secLabel': { color: 'text.primary' } }}
            >
                <ExpandMoreIcon
                    fontSize="small"
                    sx={{ color: 'text.secondary', transition: 'transform .15s', transform: open ? 'none' : 'rotate(-90deg)' }}
                />
                <Typography className="secLabel" variant="overline" color="text.secondary" sx={{ flex: 1, lineHeight: 1.2, transition: 'color .15s' }}>
                    {title}
                </Typography>
                {action && <Box onClick={(e) => e.stopPropagation()}>{action}</Box>}
            </Stack>
            <Collapse in={open} unmountOnExit>
                <Box sx={{ pt: 1 }}>
                    {description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>{description}</Typography>
                    )}
                    <Stack spacing={1.25}>{children}</Stack>
                </Box>
            </Collapse>
        </Box>
    );
}

/** Inline row: label on the left, control on the right. */
export function Field({ label, hint, control, align = 'center' }: {
    label: ReactNode; hint?: ReactNode; control: ReactNode; align?: 'center' | 'start';
}) {
    return (
        <Stack direction="row" alignItems={align === 'start' ? 'flex-start' : 'center'} spacing={1.5} sx={{ minHeight: 34 }}>
            <Box sx={{ flex: 1, minWidth: 0, pt: align === 'start' ? 0.75 : 0 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.3 }}>{label}</Typography>
                {hint && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{hint}</Typography>}
            </Box>
            <Box sx={{ flexShrink: 0 }}>{control}</Box>
        </Stack>
    );
}

/** Stacked row: a small caption label above a full-width control. */
export function StackedField({ label, hint, children }: { label?: ReactNode; hint?: ReactNode; children: ReactNode }) {
    return (
        <Box>
            {label && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>}
            {children}
            {hint && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{hint}</Typography>}
        </Box>
    );
}

/** Inline label + switch. */
export function SwitchField({ label, hint, checked, onChange }: {
    label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void;
}) {
    return <Field label={label} hint={hint} control={<Switch size="small" checked={checked} onChange={(e) => onChange(e.target.checked)} />} />;
}
