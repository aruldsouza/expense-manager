import React, { useState, useEffect, useCallback } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement, Tooltip, Legend,
    CategoryScale, LinearScale, BarElement, Title
} from 'chart.js';
import api from '../services/api';
import { Alert, Spinner, Form, Card, Row, Col } from 'react-bootstrap';
import { useCurrency } from '../context/CurrencyContext';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const CATEGORY_COLORS = [
    '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#10b981', '#6366f1',
    '#6b7280', '#f97316'
];

const CategoryAnalytics = ({ groupId, groupCurrency }) => {
    const [spending, setSpending] = useState([]);
    const [budgetStatus, setBudgetStatus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const { formatCurrency } = useCurrency();
    const gc = groupCurrency || 'USD';

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [spendRes, budgetRes] = await Promise.all([
                api.get(`/groups/${groupId}/analytics`, { params: { month: selectedMonth } }),
                api.get(`/groups/${groupId}/analytics/budget-status`, { params: { month: selectedMonth } })
            ]);
            if (spendRes.data.success) setSpending(spendRes.data.data);
            if (budgetRes.data.success) setBudgetStatus(budgetRes.data.data);
        } catch {
            setError('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [groupId, selectedMonth]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const doughnutData = {
        labels: spending.map(s => s.category),
        datasets: [{
            data: spending.map(s => s.total),
            backgroundColor: CATEGORY_COLORS.slice(0, spending.length),
            borderWidth: 2,
            borderColor: '#fff',
            hoverOffset: 8
        }]
    };

    const doughnutOptions = {
        responsive: true,
        cutout: '65%',
        plugins: {
            legend: { position: 'right', labels: { padding: 16, font: { size: 12 } } },
            tooltip: {
                callbacks: {
                    label: (ctx) => ` ${formatCurrency(ctx.parsed, gc)}`
                }
            }
        }
    };

    // Bar chart: budget vs actual (only for categories that have budgets)
    const budgetCategories = budgetStatus.map(b => b.category);
    const barData = {
        labels: budgetCategories,
        datasets: [
            {
                label: 'Budget Limit',
                data: budgetStatus.map(b => b.limit),
                backgroundColor: 'rgba(99, 102, 241, 0.4)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2,
                borderRadius: 6
            },
            {
                label: 'Actual Spent',
                data: budgetStatus.map(b => b.spent),
                backgroundColor: budgetStatus.map(b =>
                    b.exceeded ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)'
                ),
                borderColor: budgetStatus.map(b =>
                    b.exceeded ? 'rgba(239, 68, 68, 1)' : 'rgba(16, 185, 129, 1)'
                ),
                borderWidth: 2,
                borderRadius: 6
            }
        ]
    };

    const barOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Budget vs Actual Spending', font: { size: 14 } },
            tooltip: {
                callbacks: {
                    label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, gc)}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { callback: (v) => formatCurrency(v, gc) }
            }
        }
    };

    const totalSpent = spending.reduce((sum, s) => sum + s.total, 0);

    return (
        <div className="p-3">
            {/* Month picker */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <h5 className="mb-0 fw-bold">📊 Spending Analytics</h5>
                <Form.Control
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    style={{ width: 'auto' }}
                    size="sm"
                />
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {loading ? (
                <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
            ) : spending.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <div style={{ fontSize: '3rem' }}>📈</div>
                    <p className="mt-2">No expenses recorded for this month.</p>
                </div>
            ) : (
                <Row className="g-4">
                    {/* Doughnut chart */}
                    <Col md={6}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body>
                                <h6 className="fw-bold mb-1">Spending by Category</h6>
                                <p className="text-muted small mb-3">Total: <strong>{formatCurrency(totalSpent, gc)}</strong></p>
                                <div style={{ maxHeight: '280px' }}>
                                    <Doughnut data={doughnutData} options={doughnutOptions} />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Category breakdown table */}
                    <Col md={6}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body>
                                <h6 className="fw-bold mb-3">Category Breakdown</h6>
                                <div className="d-flex flex-column gap-2">
                                    {spending.map((s, i) => {
                                        const pct = totalSpent > 0 ? Math.round((s.total / totalSpent) * 100) : 0;
                                        return (
                                            <div key={s.category}>
                                                <div className="d-flex justify-content-between small mb-1">
                                                    <span className="fw-bold">{s.category}</span>
                                                    <span>{formatCurrency(s.total, gc)} <span className="text-muted">({pct}%)</span></span>
                                                </div>
                                                <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
                                                    <div
                                                        className="progress-bar"
                                                        style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Budget vs Actual bar chart — only if budgets exist */}
                    {budgetStatus.length > 0 && (
                        <Col md={12}>
                            <Card className="border-0 shadow-sm">
                                <Card.Body>
                                    <Bar data={barData} options={barOptions} />
                                </Card.Body>
                            </Card>
                        </Col>
                    )}
                </Row>
            )}
        </div>
    );
};

export default CategoryAnalytics;
