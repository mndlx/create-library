import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { DialogProvider } from './components/dialogs';
import { theme } from './theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <DialogProvider>
                <App />
            </DialogProvider>
        </ThemeProvider>
    </React.StrictMode>
);
