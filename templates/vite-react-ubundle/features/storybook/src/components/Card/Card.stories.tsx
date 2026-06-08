import type { Meta, StoryObj } from '@storybook/react';
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
                <h3 style={{ margin: 0 }}>Card title</h3>
                <p style={{ margin: 0 }}>Some descriptive content rendered inside the card body.</p>
            </>
        ),
    },
};

export const WithActions: Story = {
    args: {
        ...Default.args,
        actions: <button type="button">Edit</button>,
    },
};
