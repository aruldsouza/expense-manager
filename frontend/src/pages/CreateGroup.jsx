import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
// import { useAuth } from '../context/AuthContext'; // Unused
import { FaUsers, FaPlus, FaTimes, FaUserPlus, FaSearch } from 'react-icons/fa';
import { Container, Card, Form, Button, Row, Col, Badge, Spinner, Alert, ListGroup } from 'react-bootstrap';

const CreateGroup = () => {
    const navigate = useNavigate();
    // const { user } = useAuth(); // Unused
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Member search/selection state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]); // Array of user objects
    const [searching, setSearching] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const res = await api.get('/auth/users', {
                params: { query: searchQuery }
            });
            if (res.data.success) {
                setSearchResults(res.data.data);
            }
        } catch (err) {
            console.error(err);
            // Optionally set a search error, but usually just empty results is fine
        } finally {
            setSearching(false);
        }
    };

    const handleAddMember = (user) => {
        // Prevent duplicates
        if (!selectedMembers.some(m => m._id === user._id)) {
            setSelectedMembers([...selectedMembers, user]);
        }
        setSearchResults([]); // Clear search results after selection
        setSearchQuery('');
    };

    const handleRemoveMember = (userId) => {
        setSelectedMembers(selectedMembers.filter(m => m._id !== userId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/groups', {
                name,
                description,
                members: selectedMembers.map(m => m._id) // Send array of IDs
            });

            if (res.data.success) {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="mt-4">
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <Card className="shadow-lg border-0 rounded-3">
                        <Card.Header className="bg-primary text-white p-4 rounded-top-3">
                            <h3 className="mb-0 fw-bold d-flex align-items-center gap-2">
                                <FaPlus /> Create New Group
                            </h3>
                            <p className="mb-0 text-white-50">Start sharing expenses effortlessly</p>
                        </Card.Header>
                        <Card.Body className="p-4">
                            {error && <Alert variant="danger">{error}</Alert>}

                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3" controlId="groupName">
                                    <Form.Label className="fw-bold">Group Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Summer Trip, Apartment 302"
                                        required
                                        size="lg"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="description">
                                    <Form.Label className="fw-bold">Description (Optional)</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="What is this group for?"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-bold">Add Members</Form.Label>
                                    <div className="d-flex gap-2 mb-2">
                                        <Form.Control
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by name or email"
                                            className="flex-grow-1"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault(); // Prevent submit form
                                                    handleSearch(e);
                                                }
                                            }}
                                        />
                                        <Button
                                            variant="outline-primary"
                                            onClick={handleSearch}
                                            type="button"
                                            disabled={searching}
                                            className="d-flex align-items-center gap-1"
                                        >
                                            {searching ? <Spinner size="sm" /> : <FaSearch />}
                                        </Button>
                                    </div>

                                    {/* Search Results */}
                                    {searchResults.length > 0 && (
                                        <ListGroup className="mb-3 shadow-sm border" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                            {searchResults.map(user => (
                                                <ListGroup.Item
                                                    key={user._id}
                                                    action
                                                    onClick={() => handleAddMember(user)}
                                                    className="d-flex justify-content-between align-items-center"
                                                >
                                                    <div>
                                                        <div className="fw-bold">{user.name}</div>
                                                        <small className="text-muted">{user.email}</small>
                                                    </div>
                                                    <FaPlus className="text-primary" />
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    )}

                                    {/* Selected Members */}
                                    <div className="d-flex flex-wrap gap-2 mt-2">
                                        {selectedMembers.map((m) => (
                                            <Badge key={m._id} bg="light" text="dark" className="border d-flex align-items-center gap-2 px-3 py-2 rounded-pill">
                                                {m.name || m.email}
                                                <FaTimes
                                                    className="text-danger cursor-pointer"
                                                    onClick={() => handleRemoveMember(m._id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                    <Form.Text className="text-muted small mt-2 d-block">
                                        *You will be automatically added as the creator/admin.
                                    </Form.Text>
                                </Form.Group>

                                <div className="d-flex justify-content-end gap-2 border-top pt-3">
                                    <Button
                                        variant="light"
                                        onClick={() => navigate('/dashboard')}
                                        disabled={loading}
                                        className="fw-bold text-muted"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        disabled={loading}
                                        className="fw-bold px-4 d-flex align-items-center gap-2"
                                    >
                                        {loading ? <Spinner size="sm" /> : <><FaPlus /> Create Group</>}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default CreateGroup;
