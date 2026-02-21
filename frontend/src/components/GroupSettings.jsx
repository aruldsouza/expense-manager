import React, { useState } from 'react';
import { Card, Form, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaCog, FaTrash, FaSave } from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';

const GroupSettings = ({ group, onUpdate }) => {
    const [name, setName] = useState(group.name);
    const [description, setDescription] = useState(group.description || '');
    const [currency, setCurrency] = useState(group.currency || 'USD');
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const navigate = useNavigate();

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.put(`/groups/${group._id}`, { name, description, currency });
            if (res.data.success) {
                toast.success('Group settings updated');
                onUpdate(); // trigger parent refresh
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update group');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('⚠️ WARNING: This will permanently delete the group and all its expenses, settlements, and budgets. This action cannot be undone.\n\nAre you absolutely sure?')) {
            return;
        }

        setDeleteLoading(true);
        try {
            const res = await api.delete(`/groups/${group._id}`);
            if (res.data.success) {
                toast.success('Group deleted successfully');
                navigate('/dashboard');
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete group');
            setDeleteLoading(false);
        }
    };

    return (
        <Card className="border-0 shadow-sm glass-card">
            <Card.Body>
                <h5 className="mb-4 text-primary d-flex align-items-center gap-2">
                    <FaCog /> Group Settings
                </h5>

                <Form onSubmit={handleSave} className="mb-5">
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Group Name</Form.Label>
                        <Form.Control
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Description</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group className="mb-4">
                        <Form.Label className="fw-semibold">Base Currency</Form.Label>
                        <Form.Select value={currency} onChange={e => setCurrency(e.target.value)}>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="INR">INR (₹)</option>
                            <option value="JPY">JPY (¥)</option>
                            <option value="CAD">CAD ($)</option>
                            <option value="AUD">AUD ($)</option>
                        </Form.Select>
                        <Form.Text className="text-muted">
                            Expenses default to this currency, but can be recorded in others.
                        </Form.Text>
                    </Form.Group>

                    <Button variant="primary" type="submit" disabled={loading} className="d-flex align-items-center gap-2">
                        {loading ? <Spinner size="sm" /> : <FaSave />} Save Changes
                    </Button>
                </Form>

                <hr className="my-4 text-muted" />

                <div>
                    <h6 className="text-danger fw-bold mb-3">Danger Zone</h6>
                    <p className="text-muted small mb-3">
                        Deleting this group will permanently remove all associated expenses, settlements, budgets, and history.
                    </p>
                    <Button
                        variant="outline-danger"
                        onClick={handleDelete}
                        disabled={deleteLoading}
                        className="d-flex align-items-center gap-2"
                    >
                        {deleteLoading ? <Spinner size="sm" /> : <FaTrash />} Delete Group
                    </Button>
                </div>

            </Card.Body>
        </Card>
    );
};

export default GroupSettings;
