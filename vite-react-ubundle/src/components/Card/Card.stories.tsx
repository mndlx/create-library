import type { Meta, StoryObj } from '@storybook/react';
import { Button, Typography } from '@mui/material';
import { Card } from './Card';

const meta = {
    title: 'Components/Card',
    component: Card,
    tags: ['autodocs'],
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        children: (
            <>
                <Typography variant="h6">Card title</Typography>
                <Typography variant="body2">
                    Some descriptive content rendered inside the card body.
                </Typography>
            </>
        ),
    },
};

export const WithActions: Story = {
    args: {
        ...Default.args,
        actions: (
            <Button size="small" variant="text">
                Edit
            </Button>
        ),
    },
};
