import { Pin, Pencil, Trash2 } from 'lucide-react';

const NOTE_COLORS = ['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'teal'];

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const NoteCard = ({ note, onEdit, onDelete, onPin }) => {
  const isDefault = note.color === 'default' || !NOTE_COLORS.includes(note.color);

  return (
    <article
      className={`note-card${note.isPinned ? ' note-card-pinned' : ''}`}
      data-color={note.color || 'default'}
      aria-label={`Note: ${note.title}`}
    >
      <div className="note-card-header">
        <h3 className="note-card-title">{note.title}</h3>
        <button
          className={`note-card-pin-btn${note.isPinned ? ' pinned' : ''}`}
          onClick={() => onPin(note._id)}
          title={note.isPinned ? 'Unpin note' : 'Pin note'}
          aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
        >
          <Pin size={15} fill={note.isPinned ? 'currentColor' : 'none'} />
        </button>
      </div>

      {note.content && (
        <p className="note-card-content">{note.content}</p>
      )}

      {note.tags && note.tags.length > 0 && (
        <div className="note-card-tags">
          {note.tags.map((tag) => (
            <span key={tag} className="badge">{tag}</span>
          ))}
        </div>
      )}

      <div className="note-card-footer">
        <span className="note-card-date">{formatDate(note.updatedAt)}</span>
        <div className="note-card-actions">
          <button
            className="note-action-btn"
            onClick={() => onEdit(note)}
            title="Edit note"
            aria-label="Edit note"
          >
            <Pencil size={15} />
          </button>
          <button
            className="note-action-btn danger"
            onClick={() => onDelete(note)}
            title="Delete note"
            aria-label="Delete note"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
};

export default NoteCard;
