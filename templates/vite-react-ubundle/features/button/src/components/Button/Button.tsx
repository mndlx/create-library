import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Visual emphasis. */
    variant?: 'solid' | 'ghost';
}

/** A minimal, dependency-free button. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'solid', children, ...rest }, ref) => (
        <button ref={ref} data-variant={variant} {...rest}>
            {children}
        </button>
    ),
);

Button.displayName = 'Button';
