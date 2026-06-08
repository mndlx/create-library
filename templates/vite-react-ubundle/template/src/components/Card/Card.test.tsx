import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
    it('renders its children', () => {
        render(<Card>Hello content</Card>);
        expect(screen.getByText('Hello content')).toBeInTheDocument();
    });

    it('renders actions when provided', () => {
        render(<Card actions={<button>Do it</button>}>Body</Card>);
        expect(screen.getByRole('button', { name: 'Do it' })).toBeInTheDocument();
    });

    it('omits the action rail when no actions are passed', () => {
        render(<Card>Body</Card>);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
