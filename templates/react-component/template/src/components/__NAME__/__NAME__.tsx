import * as React from 'react';

export interface __NAME__Props extends React.HTMLAttributes<HTMLDivElement> {}

/** __NAME__ component. */
export const __NAME__ = React.forwardRef<HTMLDivElement, __NAME__Props>((props, ref) => (
    <div ref={ref} {...props} />
));

__NAME__.displayName = '__NAME__';
