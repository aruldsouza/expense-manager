import React, { useState } from 'react';

export default function GroupList({ groups, onSelectGroup, onCreateGroup }) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberEmails, setMemberEmails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const emailsArr = memberEmails.split(',').map(e => e.trim()).filter(Boolean);
      await onCreateGroup(name, description, emailsArr);
      setName('');
      setDescription('');
      setMemberEmails('');
      setShowModal(false);
    } catch (err) {
      alert(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: '700' }}>Your Expense Groups</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>Track, split, and optimize shared group expenses</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Create New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>No Groups Found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Create a group to start splitting expenses with friends or roommates.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Create Group
          </button>
        </div>
      ) : (
        <div className="grid-2">
          {groups.map(group => {
            const memberCount = group.members ? group.members.length : 0;
            return (
              <div
                key={group._id}
                className="glass-card"
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                onClick={() => onSelectGroup(group)}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: '700' }}>
                      {group.name}
                    </h3>
                    <span className="badge badge-cyan">
                      {memberCount} Member{memberCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem', minHeight: '2.4rem' }}>
                    {group.description || 'No description provided'}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '-0.4rem' }}>
                    {group.members && group.members.slice(0, 4).map((m, idx) => (
                      <div
                        key={m._id || idx}
                        title={m.name}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: `hsl(${(idx * 90) % 360}, 70%, 55%)`,
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid var(--bg-secondary)',
                          marginLeft: idx > 0 ? '-8px' : 0
                        }}
                      >
                        {m.name ? m.name.charAt(0).toUpperCase() : '?'}
                      </div>
                    ))}
                    {memberCount > 4 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '0.4rem' }}>
                        +{memberCount - 4} more
                      </span>
                    )}
                  </div>

                  <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    View Dashboard →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Group Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="glass-card modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>Create New Group</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', color: 'var(--text-dim)', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Group Name</label>
                <input
                  className="glass-input"
                  type="text"
                  placeholder="Group name (e.g. Road Trip, Weekend Getaway)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Description (Optional)</label>
                <input
                  className="glass-input"
                  type="text"
                  placeholder="Brief description of shared expenses (optional)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Member Emails (Comma separated)</label>
                <input
                  className="glass-input"
                  type="text"
                  placeholder="member1@email.com, member2@email.com"
                  value={memberEmails}
                  onChange={e => setMemberEmails(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
                  You will automatically be added as group creator.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-secondary" type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
