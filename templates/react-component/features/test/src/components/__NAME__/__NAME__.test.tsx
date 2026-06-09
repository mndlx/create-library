import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { __NAME__ } from './__NAME__';

describe('__NAME__', () => {
    it('renders', () => {
        const { container } = render(<__NAME__ data-testid="x" />);
        expect(container.firstChild).not.toBeNull();
    });
});
