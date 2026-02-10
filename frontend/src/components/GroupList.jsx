import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FaUsers, FaArrowRight, FaPlus, FaTrash } from 'react-icons/fa';
import { Card, Row, Col, Badge, Button, Spinner, Alert } from 'react-bootstrap';

const GroupList = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const res = await api.get('/groups');
                if (res.data.success) {
                    setGroups(res.data.data);
                }
            } catch (err) {
                setError('Failed to load groups');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchGroups();
    }, []);

    if (loading) return <div className="text-center py-4"><Spinner animation="border" variant="primary" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    if (groups.length === 0) {
        return (
            <Card className="text-center border-0 glass-card p-5 mx-auto" style={{ maxWidth: '500px' }}>
                <Card.Body>
                    <div className="mb-4">
                        <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-4 text-primary">
                            <FaUsers size={48} />
                        </div>
                    </div>
                    <Card.Title className="h4 fw-bold mb-3">No Groups Yet</Card.Title>
                    <Card.Text className="text-muted mb-4 fs-5">
                        You haven't joined any groups yet. Create one to get started!
                    </Card.Text>
                    <Button as={Link} to="/groups/create" className="btn-modern-primary rounded-pill px-4 py-2 fw-bold shadow-sm">
                        <FaPlus className="me-2" /> Create Group
                    </Button>
                </Card.Body>
            </Card>
        );
    }

    const handleDelete = async (groupId, e) => {
        e.preventDefault(); // Prevent link navigation
        if (window.confirm('Are you sure you want to delete this group? All expenses and data will be lost.')) {
            try {
                await api.delete(`/groups/${groupId}`);
                setGroups(groups.filter(g => g._id !== groupId));
            } catch (err) {
                alert(err.response?.data?.error || 'Failed to delete group');
            }
        }
    };

    return (
        <Row xs={1} md={2} lg={3} className="g-4 p-3">
            {groups.map((group) => (
                <Col key={group._id}>
                    <Card className="h-100 glass-card glass-card-hover border-0">
                        <Card.Body className="p-4 d-flex flex-column">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <div className="rounded-circle bg-primary bg-opacity-10 p-2 text-primary d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                                            <FaUsers size={14} />
                                        </div>
                                        <Card.Title className="fw-bold text-dark mb-0 h6">{group.name}</Card.Title>
                                    </div>
                                    <Card.Subtitle className="text-muted small ps-1">
                                        {group.description || 'No description'}
                                    </Card.Subtitle>
                                </div>
                                <Badge bg="light" text="dark" className="d-flex align-items-center gap-1 border shadow-sm rounded-pill px-3 py-2">
                                    <span className="fw-normal">{group.members?.length || 1}</span>
                                    <span className="text-muted small">Members</span>
                                </Badge>
                            </div>

                            <div className="mt-auto d-grid gap-2 pt-3">
                                <Button
                                    as={Link}
                                    to={`/groups/${group._id}`}
                                    variant="light"
                                    size="sm"
                                    className="d-flex justify-content-center align-items-center gap-2 fw-bold text-primary border shadow-sm"
                                >
                                    View Details <FaArrowRight size={12} />
                                </Button>
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={(e) => handleDelete(group._id, e)}
                                    className="d-flex justify-content-center align-items-center gap-2 text-decoration-none text-danger opacity-75 hover-opacity-100 pb-0"
                                >
                                    <FaTrash size={12} /> Delete Group
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            ))}
        </Row>
    );
};

export default GroupList;
