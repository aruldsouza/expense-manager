import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Alert, Spinner, Button, Form, Badge } from 'react-bootstrap';
import { FaDownload, FaChartPie, FaChartBar, FaUserTie, FaFrownOpen } from 'react-icons/fa';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import api from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

const CATEGORY_COLORS = {
    Food: '#ef4444', Travel: '#3b82f6', Utilities: '#f59e0b', Rent: '#8b5cf6',
    Entertainment: '#ec4899', Shopping: '#06b6d4', Health: '#10b981',
    Transport: '#6366f1', Other: '#6b7280', Custom: '#f97316'
};

const AdvancedAnalytics = ({ groupId, groupCurrency, refreshTrigger }) => {
    // We'll default to the last 6 months for a good trend view
    const defaultStart = startOfMonth(subMonths(new Date(), 5));
    const defaultEnd = endOfMonth(new Date());

    const [startDate, setStartDate] = useState(format(defaultStart, 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(defaultEnd, 'yyyy-MM-dd'));

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [categories, setCategories] = useState([]);
    const [trends, setTrends] = useState([]);
    const [userStats, setUserStats] = useState(null);

    const { formatCurrency } = useCurrency();

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { startDate, endDate };
            const [catRes, trendRes, userRes] = await Promise.all([
                api.get(`/groups/${groupId}/analytics/category`, { params }),
                api.get(`/groups/${groupId}/analytics/trends`, { params }),
                api.get(`/groups/${groupId}/analytics/users`, { params })
            ]);

            setCategories(catRes.data.data);
            setTrends(trendRes.data.data);
            setUserStats(userRes.data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [groupId, startDate, endDate, refreshTrigger]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const handleExport = () => {
        // Triggers a browser download by generating a direct URL
        let url = `${import.meta.env.VITE_API_URL}/groups/${groupId}/analytics/export`;
        const queryParams = new URLSearchParams();
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        if (queryParams.toString()) url += `?${queryParams.toString()}`;

        // We need to attach the token if our API requires it. Easiest way is to fetch as blob.
        api.get(`/groups/${groupId}/analytics/export`, {
            params: { startDate, endDate },
            responseType: 'blob'
        }).then(response => {
            const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', `group_expenses_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        }).catch(err => {
            setError('Failed to export CSV');
        });
    };

    // Formatter components for charts
    const renderCustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-2 border rounded shadow-sm">
                    <p className="mb-0 fw-bold">{data.category || data.monthYear}</p>
                    <p className="mb-0 text-primary">{formatCurrency(data.total, groupCurrency)}</p>
                    {data.count && <small className="text-muted">{data.count} expenses</small>}
                </div>
            );
        }
        return null;
    };

    const hasNoData = categories.length === 0 && trends.length === 0;

    return (
        <div className="py-3">
            {/* Header / Date Controls */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Row className="align-items-end g-3">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small text-muted mb-1">Start Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small text-muted mb-1">End Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6} className="text-md-end">
                            <Button
                                variant="outline-primary"
                                onClick={handleExport}
                                disabled={loading || hasNoData}
                                className="d-inline-flex align-items-center gap-2"
                            >
                                <FaDownload /> Export CSV
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {error && <Alert variant="danger">{error}</Alert>}

            {loading ? (
                <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : hasNoData ? (
                <div className="text-center py-5 text-muted">
                    <div style={{ fontSize: '3rem' }}>📈</div>
                    <p className="mt-3 fs-5">No expenses found for this period.</p>
                </div>
            ) : (
                <>
                    {/* Insights Row */}
                    {userStats && (
                        <Row className="g-4 mb-4">
                            <Col md={6}>
                                <Card className="border-0 shadow-sm h-100 bg-primary text-white">
                                    <Card.Body className="d-flex align-items-center">
                                        <div className="rounded-circle bg-white text-primary p-3 me-3">
                                            <FaUserTie size={24} />
                                        </div>
                                        <div>
                                            <p className="mb-0 text-white-50 small text-uppercase fw-bold">Top Spender</p>
                                            {userStats.topSpender ? (
                                                <>
                                                    <h5 className="mb-0 fw-bold">{userStats.topSpender.name}</h5>
                                                    <small>Paid {formatCurrency(userStats.topSpender.paid, groupCurrency)}</small>
                                                </>
                                            ) : (
                                                <h5 className="mb-0">None</h5>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={6}>
                                <Card className="border-0 shadow-sm h-100 bg-danger text-white">
                                    <Card.Body className="d-flex align-items-center">
                                        <div className="rounded-circle bg-white text-danger p-3 me-3">
                                            <FaFrownOpen size={24} />
                                        </div>
                                        <div>
                                            <p className="mb-0 text-white-50 small text-uppercase fw-bold">Highest Debtor</p>
                                            {userStats.highestDebtor ? (
                                                <>
                                                    <h5 className="mb-0 fw-bold">{userStats.highestDebtor.name}</h5>
                                                    <small>Owes {formatCurrency(Math.abs(userStats.highestDebtor.balance), groupCurrency)} net</small>
                                                </>
                                            ) : (
                                                <h5 className="mb-0">None</h5>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    )}

                    {/* Charts Row */}
                    <Row className="g-4">
                        {/* Spending Trends */}
                        <Col lg={7}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Body>
                                    <h5 className="mb-4 d-flex align-items-center gap-2">
                                        <FaChartBar className="text-primary" /> Monthly Spending Trends
                                    </h5>
                                    <div style={{ width: '100%', height: 300 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={trends}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                <XAxis dataKey="monthYear" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                <YAxis tickFormatter={(val) => `$${val}`} tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip content={renderCustomTooltip} cursor={{ fill: '#f3f4f6' }} />
                                                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Category Breakdown */}
                        <Col lg={5}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Body className="d-flex flex-column">
                                    <h5 className="mb-4 d-flex align-items-center gap-2">
                                        <FaChartPie className="text-primary" /> Category Breakdown
                                    </h5>
                                    <div style={{ width: '100%', height: 220 }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie
                                                    data={categories}
                                                    dataKey="total"
                                                    nameKey="category"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={90}
                                                    paddingAngle={2}
                                                >
                                                    {categories.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.Other} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip content={renderCustomTooltip} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-auto pt-3">
                                        {categories.map(c => (
                                            <div key={c.category} className="d-flex justify-content-between align-items-center mb-2 small">
                                                <span className="d-flex align-items-center gap-2">
                                                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: CATEGORY_COLORS[c.category] || CATEGORY_COLORS.Other }}></span>
                                                    {c.category}
                                                </span>
                                                <span className="fw-bold">{formatCurrency(c.total, groupCurrency)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );
};

export default AdvancedAnalytics;
