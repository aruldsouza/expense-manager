import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { FaHeartbeat, FaLightbulb, FaTrophy, FaChartLine, FaBalanceScale, FaRunning } from 'react-icons/fa';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const GRADE_CONFIG = {
    A: { color: '#10b981', label: 'Excellent', bg: 'bg-success' },
    B: { color: '#3b82f6', label: 'Good', bg: 'bg-primary' },
    C: { color: '#f59e0b', label: 'Fair', bg: 'bg-warning' },
    D: { color: '#ef4444', label: 'Poor', bg: 'bg-danger' }
};

const FACTOR_META = {
    settlementRate: { label: 'Settlement Rate', icon: <FaTrophy />, color: '#8b5cf6' },
    debtVelocity: { label: 'Debt Velocity', icon: <FaChartLine />, color: '#3b82f6' },
    balanceSpread: { label: 'Balance Spread', icon: <FaBalanceScale />, color: '#10b981' },
    recentActivity: { label: 'Recent Activity', icon: <FaRunning />, color: '#f59e0b' }
};

const HealthScore = ({ groupId, refreshTrigger }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchScore = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/groups/${groupId}/analytics/health-score`);
            setData(res.data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load health score');
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    useEffect(() => { fetchScore(); }, [fetchScore, refreshTrigger]);


    if (loading) return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (!data) return null;

    const gradeConfig = GRADE_CONFIG[data.grade] || GRADE_CONFIG.D;
    const gaugeData = [{ value: data.score, fill: gradeConfig.color }];

    return (
        <div>
            <Row className="g-4">
                {/* Score Gauge */}
                <Col lg={5}>
                    <Card className="border-0 shadow-sm h-100 text-center">
                        <Card.Body className="d-flex flex-column align-items-center justify-content-center py-4">
                            <h5 className="d-flex align-items-center gap-2 mb-4">
                                <FaHeartbeat className="text-danger" /> Financial Health Score
                            </h5>

                            {/* Radial gauge using recharts */}
                            <div style={{ width: 200, height: 200, position: 'relative' }}>
                                <ResponsiveContainer width="100%" height={200}>
                                    <RadialBarChart
                                        innerRadius="75%"
                                        outerRadius="100%"
                                        data={gaugeData}
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                                        {/* Grey background track */}
                                        <RadialBar
                                            dataKey="value"
                                            background={{ fill: '#e5e7eb' }}
                                            cornerRadius={8}
                                        />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                {/* Score overlay in centre */}
                                <div
                                    style={{
                                        position: 'absolute', inset: 0,
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <span style={{ fontSize: '2.8rem', fontWeight: 800, color: gradeConfig.color, lineHeight: 1 }}>
                                        {data.score}
                                    </span>
                                    <span className="text-muted small">/ 100</span>
                                </div>
                            </div>

                            {/* Grade badge */}
                            <Badge
                                style={{ fontSize: '1.1rem', padding: '0.5rem 1.5rem', backgroundColor: gradeConfig.color }}
                                className="mt-3"
                            >
                                Grade {data.grade} — {gradeConfig.label}
                            </Badge>

                            <p className="text-muted mt-3 small mb-0">
                                Based on {data.meta.totalExpenses} expenses &amp; {data.meta.totalSettlements} settlements
                            </p>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Factor breakdown */}
                <Col lg={7}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body>
                            <h5 className="mb-4">Score Breakdown</h5>
                            {Object.entries(data.factors).map(([key, factor]) => {
                                const meta = FACTOR_META[key];
                                const pct = Math.round((factor.score / factor.max) * 100);
                                return (
                                    <div key={key} className="mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <span className="d-flex align-items-center gap-2 small fw-semibold">
                                                <span style={{ color: meta.color }}>{meta.icon}</span>
                                                {meta.label}
                                            </span>
                                            <span className="small text-muted">{factor.score} / {factor.max}</span>
                                        </div>
                                        <div style={{ height: 8, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${pct}%`,
                                                    borderRadius: 999,
                                                    background: meta.color,
                                                    transition: 'width 0.6s ease'
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Improvement suggestions */}
            <Card className="border-0 shadow-sm mt-4">
                <Card.Body>
                    <h5 className="d-flex align-items-center gap-2 mb-3">
                        <FaLightbulb className="text-warning" /> Improvement Suggestions
                    </h5>
                    <ListGroup variant="flush">
                        {data.suggestions.map((s, i) => (
                            <ListGroup.Item key={i} className="px-0 border-bottom py-2 d-flex align-items-start gap-2">
                                <span className="text-warning fw-bold">{i + 1}.</span>
                                {s}
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </Card.Body>
            </Card>
        </div>
    );
};

export default HealthScore;
