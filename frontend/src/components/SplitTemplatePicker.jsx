import React, { useState, useEffect, useCallback } from 'react';
import {
    Modal, Button, ListGroup, Badge, Spinner, Alert,
    Form, InputGroup, Row, Col
} from 'react-bootstrap';
import {
    FaBookmark, FaRegBookmark, FaTrash, FaPlus, FaCheckCircle, FaMagic
} from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';

const SPLIT_TYPE_LABEL = { EQUAL: 'Equal', UNEQUAL: 'Unequal', PERCENT: 'Percent' };
const SPLIT_TYPE_COLOR = { EQUAL: 'primary', UNEQUAL: 'warning', PERCENT: 'info' };

// ─── Main component ───────────────────────────────────────────────────────────
const SplitTemplatePicker = ({
    show, onHide,
    groupId, groupMembers = [],
    // Current form state (so we can save it as new template)
    currentSplitType, currentInvolvedMembers, currentSplits, currentPayer,
    // Called when user picks a template
    onApply,
    // Role guard
    canWrite = true
}) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [savingNew, setSavingNew] = useState(false);
    const [newName, setNewName] = useState('');
    const [showSaveForm, setShowSaveForm] = useState(false);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/groups/${groupId}/templates`);
            setTemplates(res.data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load templates');
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    useEffect(() => {
        if (show) fetchTemplates();
    }, [show, fetchTemplates]);

    // ─── Apply template to the AddExpense form ────────────────────────────────
    const handleApply = (tpl) => {
        // Build a splits object keyed by userId: value
        const splitsObj = {};
        groupMembers.forEach(m => { splitsObj[m._id] = ''; });
        tpl.splits.forEach(s => {
            const uid = s.user?._id || s.user;
            if (uid) splitsObj[uid] = s.value;
        });

        const involvedIds = tpl.splitType === 'EQUAL'
            ? (tpl.involvedMembers.map(m => m._id || m))
            : tpl.splits.map(s => s.user?._id || s.user).filter(Boolean);

        onApply({
            splitType: tpl.splitType,
            involvedMembers: involvedIds.length > 0 ? involvedIds : groupMembers.map(m => m._id),
            splits: splitsObj,
            payer: tpl.defaultPayer?._id || tpl.defaultPayer || currentPayer
        });
        toast.success(`Template "${tpl.name}" applied!`);
        onHide();
    };

    // ─── Save current expense form state as a new template ───────────────────
    const handleSaveCurrent = async () => {
        if (!newName.trim()) return;
        setSavingNew(true);
        try {
            const splitsArr = Object.entries(currentSplits || {})
                .filter(([id]) => (currentInvolvedMembers || []).includes(id))
                .map(([id, val]) => ({ user: id, value: parseFloat(val) || 0 }));

            await api.post(`/groups/${groupId}/templates`, {
                name: newName.trim(),
                splitType: currentSplitType,
                involvedMembers: currentInvolvedMembers,
                splits: splitsArr,
                defaultPayer: currentPayer || null
            });
            toast.success('Template saved!');
            setNewName('');
            setShowSaveForm(false);
            fetchTemplates();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save template');
        } finally {
            setSavingNew(false);
        }
    };

    // ─── Toggle favorite ─────────────────────────────────────────────────────
    const handleToggleFav = async (tpl, e) => {
        e.stopPropagation();
        try {
            await api.patch(`/groups/${groupId}/templates/${tpl._id}/favorite`);
            setTemplates(prev =>
                prev.map(t => t._id === tpl._id ? { ...t, isFavorite: !t.isFavorite } : t)
                    .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
            );
        } catch {
            toast.error('Failed to update favorite');
        }
    };

    // ─── Delete template ─────────────────────────────────────────────────────
    const handleDelete = async (tpl, e) => {
        e.stopPropagation();
        if (!window.confirm(`Delete template "${tpl.name}"?`)) return;
        try {
            await api.delete(`/groups/${groupId}/templates/${tpl._id}`);
            setTemplates(prev => prev.filter(t => t._id !== tpl._id));
            toast.success('Template deleted');
        } catch {
            toast.error('Failed to delete template');
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered size="md">
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="d-flex align-items-center gap-2 fw-bold text-primary">
                    <FaMagic /> Split Templates
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {/* Save current config as template */}
                {canWrite && (
                    <div className="mb-3">
                        {showSaveForm ? (
                            <div className="bg-light rounded-3 p-3">
                                <p className="small text-muted mb-2">Save current split configuration as:</p>
                                <InputGroup>
                                    <Form.Control
                                        placeholder="Template name…"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSaveCurrent()}
                                        autoFocus
                                    />
                                    <Button variant="primary" onClick={handleSaveCurrent} disabled={!newName.trim() || savingNew}>
                                        {savingNew ? <Spinner size="sm" /> : 'Save'}
                                    </Button>
                                    <Button variant="outline-secondary" onClick={() => setShowSaveForm(false)}>
                                        Cancel
                                    </Button>
                                </InputGroup>
                            </div>
                        ) : (
                            <Button
                                variant="outline-primary"
                                size="sm"
                                className="w-100 d-flex align-items-center justify-content-center gap-2 rounded-pill"
                                onClick={() => setShowSaveForm(true)}
                            >
                                <FaPlus size={12} /> Save Current Split as Template
                            </Button>
                        )}
                    </div>
                )}

                {error && <Alert variant="danger" className="small">{error}</Alert>}

                {loading ? (
                    <div className="text-center py-4"><Spinner animation="border" variant="primary" /></div>
                ) : templates.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                        <div style={{ fontSize: '2.5rem' }}>📋</div>
                        <p className="mt-2">No templates yet. Save your first split configuration above.</p>
                    </div>
                ) : (
                    <ListGroup variant="flush" className="rounded-3 overflow-hidden shadow-sm">
                        {templates.map(tpl => (
                            <ListGroup.Item
                                key={tpl._id}
                                action
                                onClick={() => handleApply(tpl)}
                                className="d-flex justify-content-between align-items-center py-3"
                                style={{ cursor: 'pointer' }}
                            >
                                <div>
                                    <div className="d-flex align-items-center gap-2">
                                        {tpl.isFavorite && <FaBookmark className="text-warning" size={12} />}
                                        <span className="fw-semibold">{tpl.name}</span>
                                        <Badge bg={SPLIT_TYPE_COLOR[tpl.splitType]} className="fw-normal">
                                            {SPLIT_TYPE_LABEL[tpl.splitType]}
                                        </Badge>
                                    </div>
                                    <small className="text-muted">
                                        {tpl.splitType === 'EQUAL'
                                            ? `${tpl.involvedMembers.length} members equally`
                                            : tpl.splits.map(s => s.user?.name || 'Unknown').join(', ')
                                        }
                                        {tpl.defaultPayer && ` · Payer: ${tpl.defaultPayer.name}`}
                                    </small>
                                </div>

                                <div className="d-flex gap-1">
                                    {canWrite && (
                                        <>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="p-1 text-warning"
                                                title={tpl.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                                onClick={e => handleToggleFav(tpl, e)}
                                            >
                                                {tpl.isFavorite ? <FaBookmark /> : <FaRegBookmark />}
                                            </Button>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="p-1 text-danger"
                                                title="Delete template"
                                                onClick={e => handleDelete(tpl, e)}
                                            >
                                                <FaTrash />
                                            </Button>
                                        </>
                                    )}
                                    <Button variant="link" size="sm" className="p-1 text-primary" title="Apply">
                                        <FaCheckCircle />
                                    </Button>
                                </div>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default SplitTemplatePicker;
