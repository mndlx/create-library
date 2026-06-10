import { createTheme } from '@mui/material/styles';

// Dark palette tuned to feel like an editor IDE.
export const theme = createTheme({
    palette: {
        mode: 'dark',
        background: { default: '#0f1115', paper: '#171a21' },
        primary: { main: '#3399cc' },
        secondary: { main: '#4ade80' },
        warning: { main: '#fbbf24' },
        error: { main: '#f87171' },
        divider: '#2a2f3a',
        text: { primary: '#e6e8ee', secondary: '#9aa3b2' },
    },
    shape: { borderRadius: 8 },
    typography: {
        fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
        fontSize: 13.5,
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: { backgroundColor: '#171a21', backgroundImage: 'none', borderBottom: '1px solid #2a2f3a' },
            },
        },
        MuiDrawer: {
            styleOverrides: { paper: { backgroundColor: '#171a21', borderRight: '1px solid #2a2f3a' } },
        },
        MuiButton: { defaultProps: { disableElevation: true } },
    },
});
