import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, X, Pin, StickyNote, AlertCircle, Tag,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import NoteCard from '../components/NoteCard';
import NoteModal from '../components/NoteModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { getNotes, createNote, updateNote, deleteNote, pinNote } from '../services/api';

const DEBOUNCE_MS = 350;

const Dashboard = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const searchRef = useRef();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getNotes({ search: debouncedSearch, tag: activeTag });
      setNotes(data);
    } catch (err) {
      setError(err.message || 'Failed to load notes.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeTag]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Collect all unique tags from current notes for filter chips
  const allTags = [...new Set(notes.flatMap((n) => n.tags || []))].sort();

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const unpinnedNotes = notes.filter((n) => !n.isPinned);

  const handleSaveNote = async (data) => {
    if (editingNote) {
      const updated = await updateNote(editingNote._id, data);
      setNotes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
    } else {
      const created = await createNote(data);
      setNotes((prev) => [created, ...prev]);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteNote(deleteTarget._id);
      setNotes((prev) => prev.filter((n) => n._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || 'Failed to delete note.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePin = async (id) => {
    try {
      const updated = await pinNote(id);
      setNotes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
    } catch (err) {
      setError(err.message || 'Failed to update pin.');
    }
  };

  const openCreate = () => { setEditingNote(null); setShowModal(true); };
  const openEdit = (note) => { setEditingNote(note); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingNote(null); };

  const clearSearch = () => { setSearch(''); if (searchRef.current) searchRef.current.focus(); };

  const NoteGrid = ({ notes: list }) => {
    if (list.length === 0) return null;
    return (
      <div className="notes-grid">
        {list.map((note) => (
          <NoteCard
            key={note._id}
            note={note}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onPin={handlePin}
          />
        ))}
      </div>
    );
  };

  const isEmpty = !loading && notes.length === 0;
  const isFiltered = debouncedSearch || activeTag;

  return (
    <>
      <Navbar />

      <main className="dashboard">
        {/* Toolbar */}
        <div className="dashboard-toolbar">
          <div className="search-wrapper">
            <span className="search-icon" aria-hidden="true"><Search size={16} /></span>
            <input
              ref={searchRef}
              id="search-notes"
              className="input search-input"
              type="search"
              placeholder="Search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search notes"
            />
            {search && (
              <button className="search-clear" onClick={clearSearch} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <button
            id="create-note-btn"
            className="btn btn-primary"
            onClick={openCreate}
            aria-label="Create new note"
          >
            <Plus size={16} />
            New Note
          </button>
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="tag-filters" role="group" aria-label="Filter by tag">
            <span className="tag-filters-label"><Tag size={13} /></span>
            <button
              className={`badge badge-clickable${!activeTag ? ' badge-active' : ''}`}
              onClick={() => setActiveTag('')}
              aria-pressed={!activeTag}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`badge badge-clickable${activeTag === tag ? ' badge-active' : ''}`}
                onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
                aria-pressed={activeTag === tag}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '24px' }}>
            <AlertCircle size={16} />
            {error}
            <button
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <span className="spinner spinner-lg" style={{ color: 'var(--color-accent)' }} aria-label="Loading notes" />
          </div>
        )}

        {/* Notes content */}
        {!loading && (
          <>
            {/* Empty state */}
            {isEmpty && (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <StickyNote size={64} />
                </div>
                <h2 className="empty-state-title">
                  {isFiltered ? 'No notes match your search' : 'No notes yet'}
                </h2>
                <p className="empty-state-text">
                  {isFiltered
                    ? 'Try different keywords or remove the active filters.'
                    : 'Click "New Note" to create your first note and start organizing your thoughts.'}
                </p>
                {isFiltered && (
                  <button
                    className="btn btn-secondary"
                    style={{ marginTop: '20px' }}
                    onClick={() => { setSearch(''); setActiveTag(''); }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Pinned section */}
            {pinnedNotes.length > 0 && (
              <section aria-label="Pinned notes">
                <div className="notes-section-title">
                  <Pin size={12} />
                  Pinned
                </div>
                <NoteGrid notes={pinnedNotes} />
              </section>
            )}

            {/* All / other notes */}
            {unpinnedNotes.length > 0 && (
              <section aria-label={pinnedNotes.length > 0 ? 'Other notes' : 'All notes'}>
                {pinnedNotes.length > 0 && (
                  <div className="notes-section-title">
                    <StickyNote size={12} />
                    Other notes
                  </div>
                )}
                <NoteGrid notes={unpinnedNotes} />
              </section>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {showModal && (
        <NoteModal
          note={editingNote}
          onSave={handleSaveNote}
          onClose={closeModal}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Note"
          message={`Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </>
  );
};

export default Dashboard;
