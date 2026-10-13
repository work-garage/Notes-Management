import { useState, useEffect } from 'react';
import { X, Tag, AlertCircle } from 'lucide-react';

const COLORS = ['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'teal'];

const COLOR_LABELS = {
  default: 'Default', red: 'Red', orange: 'Orange', yellow: 'Yellow',
  green: 'Green', blue: 'Blue', purple: 'Purple', pink: 'Pink', teal: 'Teal',
};

const ColorSwatch = ({ color, selected, onClick }) => (
  <button
    type="button"
    className={`color-swatch swatch-${color}${selected ? ' selected' : ''}`}
    onClick={() => onClick(color)}
    title={COLOR_LABELS[color]}
    aria-label={`${COLOR_LABELS[color]} note color${selected ? ' (selected)' : ''}`}
    aria-pressed={selected}
  />
);

const NoteModal = ({ note, onSave, onClose }) => {
  const isEdit = Boolean(note);

  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [color, setColor] = useState(note?.color || 'default');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(note?.tags || []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const addTag = () => {
    const t = tagInput.trim().slice(0, 50);
    if (!t) return;
    if (tags.length >= 10) { setError('Maximum 10 tags allowed.'); return; }
    if (tags.includes(t)) { setTagInput(''); return; }
    setTags([...tags, t]);
    setTagInput('');
  };

  const removeTag = (tag) => setTags(tags.filter((t) => t !== tag));

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) { setError('Title is required.'); return; }
    if (trimmedTitle.length > 200) { setError('Title must be 200 characters or less.'); return; }

    setLoading(true);
    try {
      await onSave({ title: trimmedTitle, content: content.trim(), color, tags });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save note.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">{isEdit ? 'Edit Note' : 'New Note'}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">
                <AlertCircle size={16} />{error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="note-title">Title <span aria-hidden="true" style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input
                id="note-title"
                className="input"
                type="text"
                placeholder="Note title…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="note-content">Content</label>
              <textarea
                id="note-content"
                className="input"
                placeholder="Write your note here…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="note-tags">Tags</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }}>
                    <Tag size={14} />
                  </span>
                  <input
                    id="note-tags"
                    className="input"
                    style={{ paddingLeft: 32 }}
                    type="text"
                    placeholder="Add a tag and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                  />
                </div>
                <button type="button" className="btn btn-secondary" onClick={addTag}>
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="note-card-tags" style={{ marginTop: 8 }}>
                  {tags.map((tag) => (
                    <span key={tag} className="badge">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0, color: 'inherit', marginLeft: 2 }}
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Color</label>
              <div className="color-picker">
                {COLORS.map((c) => (
                  <ColorSwatch key={c} color={c} selected={color === c} onClick={setColor} />
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff', width: 14, height: 14 }} /> Saving…</> : (isEdit ? 'Save Changes' : 'Create Note')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteModal;
