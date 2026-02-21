import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaSignOutAlt, FaWallet } from 'react-icons/fa';
import { Navbar as BsNavbar, Nav, Container, Button } from 'react-bootstrap';
import CurrencySelector from './CurrencySelector';

const Navbar = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const userName = user?.name || 'User';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <BsNavbar expand="lg" className="navbar-glass sticky-top mb-4 py-3 shadow-sm">
            <Container>
                <BsNavbar.Brand as={Link} to="/" className="d-flex align-items-center fw-bold fs-4 text-primary">
                    <FaWallet className="me-2" />
                    <span className="text-gradient">Expense Manager</span>
                </BsNavbar.Brand>
                <BsNavbar.Toggle aria-controls="basic-navbar-nav" />
                <BsNavbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto align-items-center gap-3">
                        {user ? (
                            <>
                                <Nav.Link as={Link} to="/dashboard" className="text-dark fw-medium">Dashboard</Nav.Link>
                                <span className="text-muted d-none d-lg-inline px-2">|</span>
                                <CurrencySelector />
                                <span className="text-dark fw-bold">
                                    Hi, {userName}
                                </span>
                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={handleLogout}
                                    className="d-flex align-items-center gap-2 rounded-pill px-3"
                                >
                                    <FaSignOutAlt /> Logout
                                </Button>
                            </>
                        ) : (
                            <>
                                <Nav.Link as={Link} to="/login" className="text-dark fw-medium">Login</Nav.Link>
                                <Button as={Link} to="/register" className="btn-modern-primary rounded-pill px-4 ms-2">
                                    Register
                                </Button>
                            </>
                        )}
                    </Nav>
                </BsNavbar.Collapse>
            </Container>
        </BsNavbar>
    );
};

export default Navbar;
