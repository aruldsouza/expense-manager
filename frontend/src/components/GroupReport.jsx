import React, { useState } from 'react';
import { Button, Card, Row, Col, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import {
    FaFilePdf, FaEnvelope, FaFileExport, FaCalendarAlt, FaDownload, FaChartBar
} from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';

const GroupReport = ({ groupId, groupName, userRole }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [pdfLoading, setPdfLoading] = useState(false);
    const [csvLoading, setCsvLoading] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailResult, setEmailResult] = useState(null);

    // ─── Helpers ─────────────────────────────────────────────────────────────
    const buildParams = () => {
        const p = new URLSearchParams();
        if (startDate) p.append('startDate', startDate);
        if (endDate) p.append('endDate', endDate);
        return p.toString() ? `?${p.toString()}` : '';
    };

    // Parse JSON error from a blob response (axios blob mode returns errors as Blob)
    const blobToErrorMsg = async (err, fallback) => {
        try {
            if (err.response?.data instanceof Blob) {
                const text = await err.response.data.text();
                const json = JSON.parse(text);
                return json.error || fallback;
            }
        } catch { /* ignore parse errors */ }
        return err.response?.data?.error || err.message || fallback;
    };


    // ─── PDF Download ──────────────────────────────────────────────────────────
    const handlePdfDownload = async () => {
        setPdfLoading(true);
        try {
            const params = buildParams();
            const res = await api.get(
                `/groups/${groupId}/reports/pdf${params}`,
                { responseType: 'blob' }
            );
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${groupName.replace(/\s+/g, '_')}_report.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success('PDF report downloaded!');
        } catch (err) {
            const msg = await blobToErrorMsg(err, 'Failed to download PDF');
            toast.error(msg);
        } finally {
            setPdfLoading(false);
        }
    };

    // ─── CSV Download ─────────────────────────────────────────────────────────
    const handleCsvDownload = async () => {
        setCsvLoading(true);
        try {
            const params = buildParams();
            const res = await api.get(
                `/groups/${groupId}/analytics/export${params}`,
                { responseType: 'blob' }
            );
            const blob = new Blob([res.data], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${groupName.replace(/\s+/g, '_')}_expenses.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success('CSV downloaded!');
        } catch (err) {
            const msg = await blobToErrorMsg(err, 'Failed to download CSV');
            toast.error(msg);
        } finally {
            setCsvLoading(false);
        }
    };

    // ─── Email Report ─────────────────────────────────────────────────────────
    const handleEmailReport = async () => {
        setEmailLoading(true);
        setEmailResult(null);
        try {
            const res = await api.post(`/groups/${groupId}/reports/email`);
            setEmailResult({ success: true, message: res.data.message });
            toast.success(res.data.message);
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to send email report';
            setEmailResult({ success: false, message: msg });
            toast.error(msg);
        } finally {
            setEmailLoading(false);
        }
    };

    const isAdmin = ['Admin', 'Owner'].includes(userRole);

    return (
        <div className="p-2">
            {/* Date Range Filter */}
            <Card className="mb-4 border-0 shadow-sm">
                <Card.Body>
                    <h6 className="fw-bold d-flex align-items-center gap-2 mb-3">
                        <FaCalendarAlt className="text-primary" /> Date Range Filter
                        <span className="text-muted fw-normal small">(optional — leave blank for all-time)</span>
                    </h6>
                    <Row className="g-3">
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label className="small fw-semibold">From</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    max={endDate || undefined}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label className="small fw-semibold">To</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    min={startDate || undefined}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2} className="d-flex align-items-end">
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                className="w-100"
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                            >
                                Clear
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Export cards */}
            <Row className="g-3">
                {/* PDF Report */}
                <Col md={6}>
                    <Card className="h-100 border-0 shadow-sm" style={{ borderTop: '4px solid #dc3545' }}>
                        <Card.Body className="d-flex flex-column">
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <div
                                    className="rounded-3 d-flex align-items-center justify-content-center"
                                    style={{ width: 52, height: 52, background: '#fff0f0' }}
                                >
                                    <FaFilePdf size={26} className="text-danger" />
                                </div>
                                <div>
                                    <div className="fw-bold fs-6">PDF Report</div>
                                    <div className="text-muted small">Full financial summary with charts</div>
                                </div>
                            </div>

                            <ul className="text-muted small mb-3 ps-3">
                                <li>Summary stats cards</li>
                                <li>Category spending bar chart</li>
                                <li>Member balance breakdown</li>
                                <li>Recent expense transactions</li>
                            </ul>

                            <Badge bg="secondary" className="mb-3 align-self-start fw-normal">
                                Viewer access
                            </Badge>

                            <Button
                                variant="danger"
                                className="mt-auto d-flex align-items-center justify-content-center gap-2"
                                onClick={handlePdfDownload}
                                disabled={pdfLoading}
                            >
                                {pdfLoading
                                    ? <><Spinner size="sm" /> Generating…</>
                                    : <><FaDownload /> Download PDF</>
                                }
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>

                {/* CSV Export */}
                <Col md={6}>
                    <Card className="h-100 border-0 shadow-sm" style={{ borderTop: '4px solid #198754' }}>
                        <Card.Body className="d-flex flex-column">
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <div
                                    className="rounded-3 d-flex align-items-center justify-content-center"
                                    style={{ width: 52, height: 52, background: '#f0fff4' }}
                                >
                                    <FaFileExport size={26} className="text-success" />
                                </div>
                                <div>
                                    <div className="fw-bold fs-6">CSV Export</div>
                                    <div className="text-muted small">Raw expense data for spreadsheets</div>
                                </div>
                            </div>

                            <ul className="text-muted small mb-3 ps-3">
                                <li>Date, description, category</li>
                                <li>Amount, payer, split type</li>
                                <li>Filterable by date range</li>
                                <li>Compatible with Excel / Sheets</li>
                            </ul>

                            <Badge bg="secondary" className="mb-3 align-self-start fw-normal">
                                Viewer access
                            </Badge>

                            <Button
                                variant="success"
                                className="mt-auto d-flex align-items-center justify-content-center gap-2"
                                onClick={handleCsvDownload}
                                disabled={csvLoading}
                            >
                                {csvLoading
                                    ? <><Spinner size="sm" /> Exporting…</>
                                    : <><FaDownload /> Download CSV</>
                                }
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Email Report */}
                <Col md={12}>
                    <Card className="border-0 shadow-sm" style={{ borderTop: '4px solid #0d6efd' }}>
                        <Card.Body>
                            <div className="d-flex align-items-start gap-3">
                                <div
                                    className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{ width: 52, height: 52, background: '#f0f4ff' }}
                                >
                                    <FaEnvelope size={24} className="text-primary" />
                                </div>
                                <div className="flex-grow-1">
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <span className="fw-bold fs-6">Monthly Email Report</span>
                                        <Badge bg={isAdmin ? 'primary' : 'secondary'}>
                                            {isAdmin ? 'Admin' : 'Admin only'}
                                        </Badge>
                                    </div>
                                    <p className="text-muted small mb-2">
                                        Sends a beautiful HTML email report for the previous calendar month to all group members.
                                        Includes metric cards, category breakdown, and member balances.
                                    </p>

                                    {emailResult && (
                                        <Alert
                                            variant={emailResult.success ? 'success' : 'danger'}
                                            className="small py-2 mb-2"
                                            dismissible
                                            onClose={() => setEmailResult(null)}
                                        >
                                            {emailResult.message}
                                        </Alert>
                                    )}

                                    {!isAdmin && (
                                        <Alert variant="warning" className="small py-2 mb-2">
                                            Only group Admins and Owners can send email reports.
                                        </Alert>
                                    )}

                                    <Button
                                        variant="primary"
                                        className="d-flex align-items-center gap-2"
                                        onClick={handleEmailReport}
                                        disabled={emailLoading || !isAdmin}
                                    >
                                        {emailLoading
                                            ? <><Spinner size="sm" /> Sending…</>
                                            : <><FaEnvelope /> Send Last Month's Report</>
                                        }
                                    </Button>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default GroupReport;
