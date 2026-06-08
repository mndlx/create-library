import * as React from 'react';
import styles from './Card.module.css';

export interface CardProps {
    /** Main content rendered in the left column. */
    children: React.ReactNode;
    /** Action elements rendered in the right rail. */
    actions?: React.ReactNode;
    /** Extra class names appended to the root element. */
    className?: string;
}

/** A two-column surface: content on the left, an optional action rail on the right. */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ children, actions, className }, ref) => (
        <div ref={ref} className={[styles.card, className].filter(Boolean).join(' ')}>
            <div className={styles.body}>{children}</div>
            {actions != null && (
                <div className={styles.rail}>
                    <hr className={styles.divider} />
                    {actions}
                </div>
            )}
        </div>
    ),
);

Card.displayName = 'Card';
