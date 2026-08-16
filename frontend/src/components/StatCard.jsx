import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Spinner } from 'react-bootstrap';

const GRADIENT_PRESETS = {
    red: { bg: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', glow: 'rgba(239,68,68,0.35)' },
    green: { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', glow: 'rgba(16,185,129,0.35)' },
    amber: { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', glow: 'rgba(245,158,11,0.35)' },
    blue: { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', glow: 'rgba(59,130,246,0.35)' },
    violet: { bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', glow: 'rgba(139,92,246,0.35)' },
};

const StatCard = ({ title, value, icon, color, loading, className, trend }) => {
    const [hovered, setHovered] = useState(false);

    // Try to find a matching preset for the glow color, fallback to none
    const preset = Object.values(GRADIENT_PRESETS).find(p => p.bg === color) || { bg: color, glow: 'rgba(79,70,229,0.30)' };

    return (
        <div
            className={`stat-card-premium h-100 ${className || ''}`}
            style={{
                background: preset.bg,
                boxShadow: hovered
                    ? `0 24px 64px -8px ${preset.glow}, 0 4px 16px rgba(0,0,0,0.15)`
                    : `0 8px 32px -4px ${preset.glow}, 0 2px 8px rgba(0,0,0,0.1)`,
                color: 'white',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Decorative shimmer strip */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.35s ease',
            }} />

            <div className="p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <h6
                        className="text-uppercase mb-0"
                        style={{
                            fontSize: '0.7rem',
                            letterSpacing: '0.12em',
                            color: 'rgba(255,255,255,0.7)',
                            fontWeight: 600,
                        }}
                    >
                        {title}
                    </h6>

                    {/* Icon bubble */}
                    <div
                        style={{
                            width: '44px', height: '44px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(255,255,255,0.18)',
                            backdropFilter: 'blur(6px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transform: hovered ? 'rotate(8deg) scale(1.1)' : 'rotate(0deg) scale(1)',
                            transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                    >
                        {icon}
                    </div>
                </div>

                {loading ? (
                    <Spinner animation="grow" variant="light" size="sm" />
                ) : (
                    <div className={hovered ? 'animate-count' : ''}>
                        <div
                            style={{
                                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                                fontWeight: 800,
                                lineHeight: 1.1,
                                letterSpacing: '-0.02em',
                                fontFamily: "'Outfit', sans-serif",
                            }}
                        >
                            {value}
                        </div>
                    </div>
                )}

                {/* Trend indicator */}
                {trend && !loading && (
                    <div className="mt-2" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
                        <span>{trend.label}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

StatCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    icon: PropTypes.element.isRequired,
    color: PropTypes.string.isRequired,
    loading: PropTypes.bool,
    className: PropTypes.string,
    trend: PropTypes.shape({ direction: PropTypes.string, label: PropTypes.string }),
};

export default StatCard;
