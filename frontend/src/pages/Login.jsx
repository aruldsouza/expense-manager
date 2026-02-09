import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FaSignInAlt } from 'react-icons/fa';
import Spinner from '../components/Spinner';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const { email, password } = formData;

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
        if (res.success) {
            toast.success('Login success! Welcome back.');
            navigate('/dashboard');
        } else {
            toast.error(res.message || 'Login failed');
        }
        setLoading(false);
    };

    if (loading) {
        return <div className="h-screen flex justify-center items-center"><Spinner /></div>;
    }

    return (
        <div className="flex justify-center items-center mt-10 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md border border-gray-100">
                <div className="text-center mb-6">
                    <FaSignInAlt className="text-4xl text-blue-600 mx-auto mb-2" />
                    <h1 className="text-2xl font-bold text-gray-800">Login</h1>
                    <p className="text-gray-500">Sign in to your account</p>
                </div>

                <form onSubmit={onSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={onChange}
                            className="input"
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={password}
                            onChange={onChange}
                            className="input"
                            placeholder="Enter password"
                            required
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="btn btn-primary w-full shadow-lg hover:shadow-xl transform transition hover:-translate-y-0.5"
                        >
                            Login
                        </button>
                    </div>
                </form>

                <p className="mt-6 text-center text-gray-500 text-sm">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-blue-600 hover:text-blue-800 font-bold ml-1">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
