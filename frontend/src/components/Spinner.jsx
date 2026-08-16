import React from 'react';
import { Spinner as BsSpinner } from 'react-bootstrap';

const Spinner = ({ size = 'md', variant = 'primary' }) => {
    // Map custom size props to Bootstrap sizing if needed, or just pass classNames
    // Bootstrap Spinner has 'sm' prop. For larger, we might use style.
    return (
        <div className="d-flex justify-content-center">
            <BsSpinner animation="border" variant={variant} size={size === 'sm' ? 'sm' : undefined} role="status">
                <span className="visually-hidden">Loading...</span>
            </BsSpinner>
        </div>
    );
};

export default Spinner;
