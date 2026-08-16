import React, { useState, useRef, useEffect } from 'react';
import {
    Card, Form, Button, Spinner, Badge
} from 'react-bootstrap';
import { FaRobot, FaUser, FaPaperPlane, FaMagic } from 'react-icons/fa';
import api from '../services/api';

const SUGGESTED_QUERIES = [
    '🏆 Who owes the most?',
    '📊 Where are we spending the most?',
    '📝 Give me a monthly summary',
    '🔮 What should we focus on to improve?',
    '💸 Who is the top spender?'
];

const AIInsightChat = ({ groupId }) => {
    const [messages, setMessages] = useState([
        {
            role: 'ai',
            text: "Hello! I'm your AI financial assistant 👋 Ask me anything about this group's expenses, balances, or spending habits."
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const bottomRef = useRef(null);

    // Auto-scroll to latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (text) => {
        const userMsg = text || input.trim();
        if (!userMsg || loading) return;

        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);
        setError(null);

        try {
            const res = await api.post(`/groups/${groupId}/ai/chat`, { message: userMsg });
            setMessages(prev => [...prev, { role: 'ai', text: res.data.data.reply }]);
        } catch (err) {
            const errMsg = err.response?.data?.error || 'Failed to get a response. Please try again.';
            setError(errMsg);
            setMessages(prev => [...prev, { role: 'ai', text: `⚠️ ${errMsg}`, isError: true }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="d-flex flex-column" style={{ height: '600px' }}>
            {/* Suggested queries */}
            <div className="d-flex flex-wrap gap-2 mb-3">
                {SUGGESTED_QUERIES.map((q, i) => (
                    <Button
                        key={i}
                        variant="outline-secondary"
                        size="sm"
                        className="rounded-pill d-flex align-items-center gap-1"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => sendMessage(q.replace(/^[^\s]+\s/, ''))}  // strip emoji prefix
                        disabled={loading}
                    >
                        {q}
                    </Button>
                ))}
            </div>

            {/* Message thread */}
            <Card className="border-0 shadow-sm flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
                <Card.Body
                    className="overflow-auto d-flex flex-column gap-3 py-3"
                    style={{ height: '100%' }}
                >
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`d-flex gap-2 align-items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            {/* Avatar */}
                            <div
                                className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${msg.role === 'ai' ? 'bg-primary text-white' : 'bg-secondary text-white'}`}
                                style={{ width: 36, height: 36 }}
                            >
                                {msg.role === 'ai' ? <FaRobot size={16} /> : <FaUser size={14} />}
                            </div>

                            {/* Bubble */}
                            <div
                                className={`rounded-3 px-3 py-2 ${msg.role === 'ai' ? 'bg-light text-dark' : 'bg-primary text-white'}`}
                                style={{ maxWidth: '80%', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {loading && (
                        <div className="d-flex gap-2 align-items-start">
                            <div
                                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: 36, height: 36 }}
                            >
                                <FaRobot size={16} />
                            </div>
                            <div className="bg-light rounded-3 px-3 py-2 d-flex align-items-center gap-2">
                                <Spinner animation="grow" size="sm" variant="primary" />
                                <Spinner animation="grow" size="sm" variant="primary" style={{ animationDelay: '0.2s' }} />
                                <Spinner animation="grow" size="sm" variant="primary" style={{ animationDelay: '0.4s' }} />
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </Card.Body>
            </Card>

            {/* Input row */}
            <div className="d-flex gap-2 mt-3">
                <Form.Control
                    as="textarea"
                    rows={1}
                    placeholder="Ask about expenses, balances, or spending trends…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    style={{ resize: 'none', borderRadius: '1rem' }}
                />
                <Button
                    variant="primary"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 46, height: 46 }}
                    title="Send"
                >
                    <FaPaperPlane size={16} />
                </Button>
            </div>

            <p className="text-muted text-center mt-2" style={{ fontSize: '0.72rem' }}>
                <FaMagic className="me-1" />
                Powered by Google Gemini · Responses are based on your group&apos;s real financial data
            </p>
        </div>
    );
};

export default AIInsightChat;
