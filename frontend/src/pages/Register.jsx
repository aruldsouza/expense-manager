import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Container, Row, Col, Card, Form, Button, Spinner } from 'react-bootstrap';
import { FaUser, FaLock, FaEnvelope, FaUserPlus } from 'react-icons/fa';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const { name, email, password, confirmPassword } = formData;

    const [loading, setLoading] = useState(false);
    const { register, user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);

        const res = await register(name, email, password);
        setLoading(false);

        if (res.success) {
            navigate('/login');
            toast.success('Registration successful. Please login.');
        } else {
            toast.error(res.message || 'Registration failed');
        }
    };

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center vh-100">
                <Spinner animation="border" variant="primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </Container>
        );
    }

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <Card className="shadow border-0 rounded-3">
                        <Card.Body className="p-5">
                            <div className="text-center mb-4">
                                <FaUserPlus className="text-secondary mb-3" size={40} />
                                <h2 className="fw-bold">Create Account</h2>
                                <p className="text-muted">Register to start managing expenses</p>
                            </div>

                            <Form onSubmit={onSubmit}>
                                <Form.Group className="mb-3" controlId="name">
                                    <Form.Label className="fw-bold">Full Name</Form.Label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light border-end-0">
                                            <FaUser className="text-muted" />
                                        </span>
                                        <Form.Control
                                            type="text"
                                            name="name"
                                            value={name}
                                            onChange={onChange}
                                            placeholder="John Doe"
                                            required
                                            className="border-start-0 ps-0"
                                        />
                                    </div>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="email">
                                    <Form.Label className="fw-bold">Email Address</Form.Label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light border-end-0">
                                            <FaEnvelope className="text-muted" />
                                        </span>
                                        <Form.Control
                                            type="email"
                                            name="email"
                                            value={email}
                                            onChange={onChange}
                                            placeholder="name@example.com"
                                            required
                                            className="border-start-0 ps-0"
                                        />
                                    </div>
                                </Form.Group>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3" controlId="password">
                                            <Form.Label className="fw-bold">Password</Form.Label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light border-end-0">
                                                    <FaLock className="text-muted" />
                                                </span>
                                                <Form.Control
                                                    type="password"
                                                    name="password"
                                                    value={password}
                                                    onChange={onChange}
                                                    placeholder="Create password"
                                                    required
                                                    className="border-start-0 ps-0"
                                                />
                                            </div>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-4" controlId="confirmPassword">
                                            <Form.Label className="fw-bold">Confirm Password</Form.Label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light border-end-0">
                                                    <FaLock className="text-muted" />
                                                </span>
                                                <Form.Control
                                                    type="password"
                                                    name="confirmPassword"
                                                    value={confirmPassword}
                                                    onChange={onChange}
                                                    placeholder="Confirm password"
                                                    required
                                                    className="border-start-0 ps-0"
                                                />
                                            </div>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <div className="d-grid">
                                    <Button variant="success" size="lg" type="submit" className="fw-bold shadow-sm">
                                        Sign Up
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                        <Card.Footer className="bg-white text-center py-3 border-0">
                            <p className="mb-0 text-muted">
                                Already have an account? <Link to="/login" className="fw-bold text-decoration-none">Login</Link>
                            </p>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Register;
