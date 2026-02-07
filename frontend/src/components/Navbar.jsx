
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaSignOutAlt, FaWallet } from 'react-icons/fa';

const Navbar = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-blue-600 text-white shadow-lg">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <Link to="/" className="text-xl font-bold flex items-center gap-2">
                    <FaWallet /> Expense Manager
                </Link>
                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <span className="hidden md:inline text-blue-200">Hello, {user.name}</span>
                            <Link to="/dashboard" className="hover:text-blue-200">Dashboard</Link>
                            <Link to="/groups" className="hover:text-blue-200">Groups</Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1 hover:text-red-200"
                            >
                                <FaSignOutAlt /> Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="hover:text-blue-200">Login</Link>
                            <Link to="/register" className="hover:text-blue-200">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
