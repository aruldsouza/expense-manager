import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Container, Row, Col, Card, Form, Button, Spinner } from 'react-bootstrap';
import { FaLock, FaEnvelope, FaSignInAlt } from 'react-icons/fa';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const { email, password } = formData;

    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
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
        setLoading(true);

        const res = await login(email, password);
        setLoading(false);

        if (res.success) {
            navigate('/dashboard');
            toast.success('Login success! Welcome back.');
        } else {
            toast.error(res.message || 'Login failed');
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
                <Col md={6} lg={5}>
                    <Card className="shadow border-0 rounded-3">
                        <Card.Body className="p-5">
                            <div className="text-center mb-4">
                                <FaSignInAlt className="text-primary mb-3" size={40} />
                                <h2 className="fw-bold">Login</h2>
                                <p className="text-muted">Sign in to your account</p>
                            </div>

                            <Form onSubmit={onSubmit}>
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
                                            placeholder="Enter your email"
                                            required
                                            className="border-start-0 ps-0"
                                        />
                                    </div>
                                </Form.Group>

                                <Form.Group className="mb-4" controlId="password">
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
                                            placeholder="Enter password"
                                            required
                                            className="border-start-0 ps-0"
                                        />
                                    </div>
                                </Form.Group>

                                <div className="d-grid">
                                    <Button variant="primary" size="lg" type="submit" className="fw-bold shadow-sm">
                                        Login
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                        <Card.Footer className="bg-white text-center py-3 border-0">
                            <p className="mb-0 text-muted">
                                Don't have an account? <Link to="/register" className="fw-bold text-decoration-none">Register</Link>
                            </p>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Login;
