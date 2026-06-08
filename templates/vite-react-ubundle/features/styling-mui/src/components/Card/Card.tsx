import * as React from 'react';
import { Box, Divider } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export interface CardProps {
    /** Main content rendered in the left column. */
    children: React.ReactNode;
    /** Action elements rendered in the right rail. */
    actions?: React.ReactNode;
    /** Style overrides merged into the root container. */
    sx?: SxProps<Theme>;
}

/** A two-column surface: content on the left, an optional action rail on the right. */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ children, actions, sx }, ref) => (
        <Box
            ref={ref}
            sx={{
                textAlign: 'left',
                width: '100%',
                backgroundColor: 'background.paper',
                display: 'flex',
                flexDirection: 'row',
                border: '1px solid',
                borderColor: 'divider',
                gap: 2,
                ...sx,
            }}
        >
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
                {children}
            </Box>
            {actions != null && (
                <Box
                    sx={{
                        width: 48,
                        backgroundColor: 'action.hover',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 1,
                        p: 1,
                    }}
                >
                    <Divider sx={{ width: '100%' }} />
                    {actions}
                </Box>
            )}
        </Box>
    ),
);

Card.displayName = 'Card';
