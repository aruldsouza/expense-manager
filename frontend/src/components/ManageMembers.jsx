import React, { useState } from 'react';
import { Card, Table, Button, Form, Spinner, Badge, InputGroup, ListGroup } from 'react-bootstrap';
import { FaTrash, FaUserShield, FaUser, FaEye, FaSearch, FaUserPlus } from 'react-icons/fa';
import api from '../services/api';
import toast from 'react-hot-toast';

const ROLE_ICONS = {
    'Admin': <FaUserShield className="text-danger me-1" />,
    'Member': <FaUser className="text-primary me-1" />,
    'Viewer': <FaEye className="text-secondary me-1" />
};

const ROLE_COLORS = {
    'Admin': 'danger',
    'Member': 'primary',
    'Viewer': 'secondary'
};

const ManageMembers = ({ groupId, members, currentUserId, creatorId, onUpdate }) => {
    const [loadingId, setLoadingId] = useState(null);

    // Add Member State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [addingUser, setAddingUser] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const res = await api.get('/auth/users', {
                params: { query: searchQuery }
            });
            if (res.data.success) {
                // Filter out existing members from search results
                const existingUserIds = members.map(m => (m.user?._id || m._id).toString());
                const filteredResults = res.data.data.filter(u => !existingUserIds.includes(u._id.toString()));
                setSearchResults(filteredResults);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    };

    const handleAddMember = async (user) => {
        setAddingUser(user._id);
        try {
            const res = await api.post(`/groups/${groupId}/members`, { userId: user._id, role: 'Member' });
            if (res.data.success) {
                toast.success('Member added successfully');
                setSearchQuery('');
                setSearchResults([]);
                onUpdate(); // refresh group members
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add member');
        } finally {
            setAddingUser(null);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        setLoadingId(userId);
        try {
            const res = await api.patch(`/groups/${groupId}/members/${userId}/role`, { role: newRole });
            if (res.data.success) {
                toast.success('Role updated');
                onUpdate(); // trigger parent refresh
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update role');
        } finally {
            setLoadingId(null);
        }
    };

    const handleRemove = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        setLoadingId(userId);
        try {
            const res = await api.delete(`/groups/${groupId}/members/${userId}`);
            if (res.data.success) {
                toast.success('Member removed');
                onUpdate(); // trigger parent refresh
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to remove member');
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <Card className="border-0 shadow-sm glass-card">
            <Card.Body>
                <h5 className="mb-4 text-primary d-flex align-items-center gap-2">
                    <FaUserShield /> Manage Members
                </h5>

                {/* Add Member Section */}
                <div className="mb-4 p-3 bg-light rounded-3 border">
                    <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                        <FaUserPlus /> Invite New Member
                    </h6>
                    <div className="d-flex gap-2 mb-2">
                        <Form.Control
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSearch(e);
                                }
                            }}
                        />
                        <Button
                            variant="primary"
                            onClick={handleSearch}
                            disabled={searching}
                            className="d-flex align-items-center gap-1 px-3"
                        >
                            {searching ? <Spinner size="sm" /> : <FaSearch />} <span className="d-none d-md-inline">Search</span>
                        </Button>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <ListGroup className="shadow-sm border mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {searchResults.map(user => (
                                <ListGroup.Item
                                    key={user._id}
                                    className="d-flex justify-content-between align-items-center"
                                >
                                    <div>
                                        <div className="fw-bold">{user.name}</div>
                                        <small className="text-muted">{user.email}</small>
                                    </div>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => handleAddMember(user)}
                                        disabled={addingUser === user._id}
                                    >
                                        {addingUser === user._id ? <Spinner size="sm" /> : 'Invite'}
                                    </Button>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    )}
                    {searchQuery && searchResults.length === 0 && !searching && (
                        <div className="text-muted small mt-2">No users found or they are already in the group.</div>
                    )}
                </div>

                <hr className="my-4" />

                <Table responsive hover className="align-middle border-top">
                    <thead className="table-light">
                        <tr>
                            <th>User</th>
                            <th>Current Role</th>
                            <th>Change Role</th>
                            <th className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map(m => {
                            // Extract user info (handle legacy format just in case, though backend populates it)
                            const userId = m.user?._id || m._id;
                            const userName = m.user?.name || m.name || 'Unknown User';
                            const userEmail = m.user?.email || m.email || '';
                            const role = m.role || 'Member';

                            const isMe = userId === currentUserId;
                            const isCreator = userId === creatorId;

                            return (
                                <tr key={userId}>
                                    <td>
                                        <div className="fw-bold">{userName} {isMe && <Badge bg="info" className="ms-1">You</Badge>}</div>
                                        <div className="text-muted small">{userEmail}</div>
                                    </td>
                                    <td>
                                        <Badge bg={ROLE_COLORS[role]} className="d-inline-flex align-items-center">
                                            {ROLE_ICONS[role]} {role}
                                        </Badge>
                                    </td>
                                    <td>
                                        <Form.Select
                                            size="sm"
                                            value={role}
                                            onChange={(e) => handleRoleChange(userId, e.target.value)}
                                            disabled={loadingId === userId || isCreator}
                                            style={{ width: '130px' }}
                                        >
                                            <option value="Admin">Admin</option>
                                            <option value="Member">Member</option>
                                            <option value="Viewer">Viewer</option>
                                        </Form.Select>
                                        {isCreator && <div className="text-muted" style={{ fontSize: '0.65rem', marginTop: '2px' }}>Creator must be Admin</div>}
                                    </td>
                                    <td className="text-end">
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => handleRemove(userId)}
                                            disabled={loadingId === userId || isCreator || isMe}
                                            className="d-inline-flex align-items-center gap-1"
                                        >
                                            {loadingId === userId ? <Spinner size="sm" /> : <FaTrash />}
                                            <span className="d-none d-md-inline">Remove</span>
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
};

export default ManageMembers;
