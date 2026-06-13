import { alpha, createTheme } from '@mui/material/styles';

const BG = '#0d0f14';
const PAPER = '#151820';
const ELEV = '#1b1f29';
const LINE = '#262b37';
const PRIMARY = '#5b9dff';
const SECONDARY = '#4ade80';

// Polished dark theme — IDE-flavored, soft contrast, consistent rounding.
export const theme = createTheme({
    palette: {
        mode: 'dark',
        background: { default: BG, paper: PAPER },
        primary: { main: PRIMARY },
        secondary: { main: SECONDARY },
        warning: { main: '#f5b54a' },
        error: { main: '#f87171' },
        success: { main: '#4ade80' },
        info: { main: '#5b9dff' },
        divider: LINE,
        text: { primary: '#e7eaf1', secondary: '#98a2b3' },
    },
    shape: { borderRadius: 10 },
    typography: {
        fontFamily: '"Inter", system-ui, "Segoe UI", Roboto, sans-serif',
        fontSize: 13.5,
        h6: { fontWeight: 700, letterSpacing: '-0.01em' },
        subtitle1: { fontWeight: 600 },
        subtitle2: { fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 600 },
        overline: { letterSpacing: '0.08em', fontWeight: 700, fontSize: 11 },
        caption: { lineHeight: 1.5 },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarColor: `${LINE} transparent`,
                    scrollbarWidth: 'thin',
                },
                '*::-webkit-scrollbar': { width: 10, height: 10 },
                '*::-webkit-scrollbar-thumb': {
                    backgroundColor: LINE,
                    borderRadius: 8,
                    border: '2px solid transparent',
                    backgroundClip: 'content-box',
                },
                '*::-webkit-scrollbar-thumb:hover': { backgroundColor: '#323a49' },
                '*::-webkit-scrollbar-corner': { backgroundColor: 'transparent' },
                code: {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: '0.85em',
                    background: alpha(PRIMARY, 0.12),
                    color: '#bcd6ff',
                    padding: '1px 5px',
                    borderRadius: 5,
                },
            },
        },
        MuiAppBar: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: {
                    backgroundColor: alpha(PAPER, 0.85),
                    backdropFilter: 'blur(8px)',
                    backgroundImage: 'none',
                    borderBottom: `1px solid ${LINE}`,
                },
            },
        },
        MuiDrawer: {
            styleOverrides: { paper: { backgroundColor: PAPER, borderRight: `1px solid ${LINE}`, backgroundImage: 'none' } },
        },
        MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: { borderRadius: 8 },
                sizeSmall: { paddingTop: 4, paddingBottom: 4 },
                containedPrimary: { color: '#06121f' },
                outlined: { borderColor: LINE },
            },
        },
        MuiIconButton: {
            styleOverrides: { root: { borderRadius: 8, '&:hover': { backgroundColor: alpha(PRIMARY, 0.1) } } },
        },
        MuiToggleButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none', fontWeight: 600, borderColor: LINE,
                    '&.Mui-selected': { backgroundColor: alpha(PRIMARY, 0.16), color: '#bcd6ff', '&:hover': { backgroundColor: alpha(PRIMARY, 0.22) } },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { fontWeight: 600 },
                outlined: { borderColor: LINE },
            },
        },
        MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 0 } } },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    marginInline: 6,
                    '&.Mui-selected': {
                        backgroundColor: alpha(PRIMARY, 0.14),
                        '&:hover': { backgroundColor: alpha(PRIMARY, 0.2) },
                    },
                },
            },
        },
        MuiAccordion: {
            defaultProps: { disableGutters: true, elevation: 0 },
            styleOverrides: {
                root: { backgroundColor: 'transparent', backgroundImage: 'none', '&:before': { display: 'none' } },
            },
        },
        MuiAccordionSummary: {
            styleOverrides: {
                root: { paddingInline: 16, minHeight: 44, '&:hover': { backgroundColor: alpha('#ffffff', 0.02) } },
                content: { marginBlock: 8 },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: alpha('#000', 0.18),
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: LINE },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#39414f' },
                },
            },
        },
        MuiDialog: {
            styleOverrides: { paper: { backgroundColor: ELEV, backgroundImage: 'none', border: `1px solid ${LINE}`, borderRadius: 14 } },
        },
        MuiMenu: {
            styleOverrides: { paper: { backgroundColor: ELEV, border: `1px solid ${LINE}`, backgroundImage: 'none' } },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: { backgroundColor: ELEV, border: `1px solid ${LINE}`, fontSize: 11.5, fontWeight: 500, color: '#e7eaf1' },
                arrow: { color: ELEV },
            },
        },
        MuiDivider: { styleOverrides: { root: { borderColor: LINE } } },
        MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundColor: ELEV, border: `1px solid ${LINE}` } } },
        MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },
        MuiSwitch: { styleOverrides: { root: { '& .Mui-checked': { color: PRIMARY } } } },
    },
});
