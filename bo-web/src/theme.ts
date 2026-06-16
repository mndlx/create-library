import { alpha, createTheme } from '@mui/material/styles';

/**
 * Dark glassmorphism theme — a floating frosted UI on an indigo wallpaper.
 *
 * The wallpaper gradient lives on <body> (see MuiCssBaseline). Surfaces above it
 * (AppBar, Drawer, dialogs, cards) are translucent dark glass with a hairline
 * light border + soft shadow, so the gradient glows through. `background.default`
 * stays a solid color so `bgcolor` tokens and Monaco chrome keep working.
 */

const BG = '#1a1d2e'; // solid default — under the glass, matches the editor
const PAPER = '#222742'; // solid paper fallback

// Translucent glass fills
const GLASS = 'rgba(24, 27, 46, 0.66)'; // sidebar / right panel
const GLASS_BAR = 'rgba(22, 25, 42, 0.55)'; // app bar
const GLASS_STRONG = 'rgba(33, 37, 62, 0.88)'; // dialogs / menus / tooltips
const CARD = 'rgba(44, 49, 82, 0.5)'; // list cards
const BORDER = 'rgba(255, 255, 255, 0.08)'; // hairline light border
const BORDER_2 = 'rgba(255, 255, 255, 0.13)';

const PRIMARY = '#7b86ff'; // periwinkle/indigo accent
const PRIMARY_GRAD = 'linear-gradient(135deg, #6d7bff 0%, #9a7bff 100%)';
const SECONDARY = '#c084fc'; // violet
const TEXT = '#e9ecf8';
const TEXT2 = '#a6abc8';
const DIVIDER = 'rgba(255, 255, 255, 0.07)';

const WALLPAPER =
    'radial-gradient(1000px 640px at 50% -8%, rgba(150,160,224,0.45) 0%, rgba(150,160,224,0) 60%),' +
    ' linear-gradient(157deg, #454c80 0%, #343a62 42%, #232742 100%)';

const SHADOW_CARD = '0 2px 12px rgba(7, 9, 24, 0.35)';
const SHADOW_FLOAT = '0 28px 64px -16px rgba(4, 6, 18, 0.7)';
const GLOW_PRIMARY = `0 0 0 1px ${alpha(PRIMARY, 0.45)}, 0 10px 28px -8px ${alpha(PRIMARY, 0.55)}`;

export const tokens = {
    BG, PAPER, GLASS, GLASS_BAR, GLASS_STRONG, CARD, BORDER, BORDER_2,
    PRIMARY, PRIMARY_GRAD, SECONDARY, TEXT, TEXT2, DIVIDER,
    WALLPAPER, SHADOW_CARD, SHADOW_FLOAT, GLOW_PRIMARY,
};

export const theme = createTheme({
    palette: {
        mode: 'dark',
        background: { default: BG, paper: PAPER },
        primary: { main: PRIMARY },
        secondary: { main: SECONDARY },
        warning: { main: '#fbbf6b' },
        error: { main: '#fb7185' },
        success: { main: '#5fe3a1' },
        info: { main: '#7b86ff' },
        divider: DIVIDER,
        text: { primary: TEXT, secondary: TEXT2 },
    },
    shape: { borderRadius: 12 },
    typography: {
        fontFamily: '"Inter", system-ui, "Segoe UI", Roboto, sans-serif',
        fontSize: 13.5,
        h6: { fontWeight: 700, letterSpacing: '-0.01em' },
        subtitle1: { fontWeight: 600 },
        subtitle2: { fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 600 },
        overline: { letterSpacing: '0.1em', fontWeight: 700, fontSize: 11 },
        caption: { lineHeight: 1.5 },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                ':root': {
                    '--glass-bg': GLASS,
                    '--glass-bg-strong': GLASS_STRONG,
                    '--glass-card': CARD,
                    '--glass-border': BORDER,
                    '--glass-border-2': BORDER_2,
                    '--primary-grad': PRIMARY_GRAD,
                    '--shadow-card': SHADOW_CARD,
                    '--shadow-float': SHADOW_FLOAT,
                    '--glow-primary': GLOW_PRIMARY,
                },
                html: { height: '100%' },
                body: {
                    height: '100%',
                    backgroundColor: '#232742',
                    backgroundImage: WALLPAPER,
                    backgroundAttachment: 'fixed',
                    backgroundRepeat: 'no-repeat',
                    scrollbarColor: `${alpha('#fff', 0.16)} transparent`,
                    scrollbarWidth: 'thin',
                },
                '#root': { height: '100%' },
                '*::-webkit-scrollbar': { width: 10, height: 10 },
                '*::-webkit-scrollbar-thumb': {
                    backgroundColor: alpha('#fff', 0.14),
                    borderRadius: 8,
                    border: '2px solid transparent',
                    backgroundClip: 'content-box',
                },
                '*::-webkit-scrollbar-thumb:hover': { backgroundColor: alpha('#fff', 0.24) },
                '*::-webkit-scrollbar-corner': { backgroundColor: 'transparent' },
                code: {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: '0.85em',
                    background: alpha(PRIMARY, 0.16),
                    color: '#c7cdff',
                    padding: '1px 5px',
                    borderRadius: 6,
                },
            },
        },
        MuiAppBar: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: {
                    backgroundColor: GLASS_BAR,
                    backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                    backgroundImage: 'none',
                    borderBottom: `1px solid ${BORDER}`,
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: GLASS,
                    backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                    borderRight: `1px solid ${BORDER}`,
                    backgroundImage: 'none',
                },
            },
        },
        MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: { borderRadius: 10 },
                sizeSmall: { paddingTop: 4, paddingBottom: 4 },
                containedPrimary: {
                    backgroundImage: PRIMARY_GRAD,
                    color: '#fff',
                    boxShadow: `0 6px 18px -6px ${alpha(PRIMARY, 0.7)}`,
                    '&:hover': { backgroundImage: PRIMARY_GRAD, filter: 'brightness(1.08)', boxShadow: `0 8px 22px -6px ${alpha(PRIMARY, 0.8)}` },
                },
                outlined: {
                    borderColor: BORDER_2,
                    backgroundColor: alpha('#fff', 0.03),
                    '&:hover': { borderColor: alpha(PRIMARY, 0.6), backgroundColor: alpha(PRIMARY, 0.08) },
                },
                text: { '&:hover': { backgroundColor: alpha('#fff', 0.06) } },
            },
        },
        MuiIconButton: {
            styleOverrides: { root: { borderRadius: 10, '&:hover': { backgroundColor: alpha(PRIMARY, 0.12) } } },
        },
        MuiToggleButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none', fontWeight: 600, borderColor: BORDER_2,
                    '&.Mui-selected': { backgroundColor: alpha(PRIMARY, 0.2), color: '#cdd3ff', '&:hover': { backgroundColor: alpha(PRIMARY, 0.28) } },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { fontWeight: 600 },
                outlined: { borderColor: BORDER_2 },
                colorPrimary: { '&.MuiChip-outlined': { borderColor: alpha(PRIMARY, 0.5), color: '#c7cdff' } },
            },
        },
        MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 0 } } },
        MuiTabs: {
            styleOverrides: {
                indicator: { height: 2.5, borderRadius: 2, backgroundImage: PRIMARY_GRAD },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    marginInline: 6,
                    transition: 'background-color .12s, box-shadow .12s',
                    '&.Mui-selected': {
                        backgroundColor: alpha(PRIMARY, 0.18),
                        boxShadow: `inset 2px 0 0 ${PRIMARY}`,
                        '&:hover': { backgroundColor: alpha(PRIMARY, 0.24) },
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
                root: { paddingInline: 16, minHeight: 44, '&:hover': { backgroundColor: alpha('#fff', 0.03) } },
                content: { marginBlock: 8 },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    backgroundColor: alpha('#0c0e1a', 0.35),
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER_2 },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(PRIMARY, 0.5) },
                    '&.Mui-focused': { backgroundColor: alpha('#0c0e1a', 0.45) },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: PRIMARY, borderWidth: 1, boxShadow: `0 0 0 3px ${alpha(PRIMARY, 0.18)}` },
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: GLASS_STRONG,
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    backgroundImage: 'none',
                    border: `1px solid ${BORDER_2}`,
                    borderRadius: 18,
                    boxShadow: SHADOW_FLOAT,
                },
            },
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    backgroundColor: GLASS_STRONG,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${BORDER_2}`,
                    backgroundImage: 'none',
                    borderRadius: 12,
                    boxShadow: SHADOW_FLOAT,
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    backgroundColor: GLASS_STRONG,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: `1px solid ${BORDER_2}`,
                    fontSize: 11.5, fontWeight: 500, color: TEXT,
                },
                arrow: { color: GLASS_STRONG },
            },
        },
        MuiDivider: { styleOverrides: { root: { borderColor: DIVIDER } } },
        MuiCard: {
            defaultProps: { elevation: 0 },
            styleOverrides: { root: { backgroundColor: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: SHADOW_CARD } },
        },
        MuiAlert: {
            styleOverrides: {
                root: { borderRadius: 12, border: `1px solid ${BORDER}`, backdropFilter: 'blur(8px)' },
                standardWarning: { backgroundColor: alpha('#fbbf6b', 0.14) },
                standardError: { backgroundColor: alpha('#fb7185', 0.14) },
                standardSuccess: { backgroundColor: alpha('#5fe3a1', 0.14) },
                standardInfo: { backgroundColor: alpha(PRIMARY, 0.14) },
            },
        },
        MuiSwitch: { styleOverrides: { root: { '& .Mui-checked': { color: PRIMARY } } } },
    },
});
