import React from 'react';
import PropTypes from 'prop-types';
import { Card, Spinner } from 'react-bootstrap';

const StatCard = ({ title, value, icon, color, loading, className }) => {
    return (
        <Card className={`h-100 border-0 ${className} text-white`} style={{ background: color, borderRadius: '16px' }}>
            <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 className="text-white-50 text-uppercase mb-2" style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                            {title}
                        </h6>
                        {loading ? (
                            <Spinner animation="grow" variant="light" size="sm" />
                        ) : (
                            <h2 className="mb-0 fw-bold">{value}</h2>
                        )}
                    </div>
                    <div
                        className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                        style={{ width: '50px', height: '50px', backgroundColor: 'rgba(255,255,255,0.2)' }}
                    >
                        {icon}
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
};

StatCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    icon: PropTypes.element.isRequired,
    color: PropTypes.string.isRequired,
    loading: PropTypes.bool,
    className: PropTypes.string
};

export default StatCard;
