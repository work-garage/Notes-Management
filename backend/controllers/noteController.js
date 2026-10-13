const { Note, VALID_COLORS } = require('../models/Note');
const { getRedisClient, isRedisAvailable } = require('../config/redis');
const { body, param, query, validationResult } = require('express-validator');

const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '60', 10);

// ─── Validation rules ─────────────────────────────────────────────────────────

const noteValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ max: 200 }).withMessage('Title must be 200 characters or less.'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 50000 }).withMessage('Content is too long.'),
  body('tags')
    .optional()
    .isArray({ max: 10 }).withMessage('Tags must be an array with at most 10 items.'),
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 }).withMessage('Each tag must be 50 characters or less.'),
  body('color')
    .optional()
    .isIn(VALID_COLORS).withMessage(`Color must be one of: ${VALID_COLORS.join(', ')}.`),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
  }
  next();
};

// ─── Cache helpers ────────────────────────────────────────────────────────────

const getUserCacheVersion = async (sub) => {
  const client = getRedisClient();
  if (!client) return 0;
  try {
    const v = await client.get(`cv:${sub}`);
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
};

const incrementUserCacheVersion = async (sub) => {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.incr(`cv:${sub}`);
  } catch (err) {
    console.warn('[Redis] Failed to increment cache version:', err.code || err.message);
  }
};

const buildCacheKey = (sub, version, search, tag) => {
  const s = (search || '').toLowerCase().trim();
  const t = (tag || '').toLowerCase().trim();
  return `notes:${sub}:v${version}:s:${s}:t:${t}`;
};

const getCachedNotes = async (sub, search, tag) => {
  if (!isRedisAvailable()) return null;
  try {
    const version = await getUserCacheVersion(sub);
    const key = buildCacheKey(sub, version, search, tag);
    const cached = await getRedisClient().get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn('[Redis] Cache read error:', err.code || err.message);
  }
  return null;
};

const setCachedNotes = async (sub, search, tag, data) => {
  if (!isRedisAvailable()) return;
  try {
    const version = await getUserCacheVersion(sub);
    const key = buildCacheKey(sub, version, search, tag);
    await getRedisClient().setEx(key, CACHE_TTL, JSON.stringify(data));
  } catch (err) {
    console.warn('[Redis] Cache write error:', err.code || err.message);
  }
};

// ─── Controllers ──────────────────────────────────────────────────────────────

const getNotes = async (req, res) => {
  try {
    const { sub } = req.user;
    const search = (req.query.search || '').trim();
    const tag = (req.query.tag || '').trim();

    // Try cache first
    const cached = await getCachedNotes(sub, search, tag);
    if (cached) {
      return res.json({ notes: cached, fromCache: true });
    }

    // Build DB query
    const filter = { ownerSub: sub };

    if (search) {
      // Escape special regex characters for safety
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ title: regex }, { content: regex }];
    }

    if (tag) {
      filter.tags = tag;
    }

    const notes = await Note.find(filter)
      .sort({ isPinned: -1, updatedAt: -1 })
      .lean();

    // Populate cache
    await setCachedNotes(sub, search, tag, notes);

    res.json({ notes, fromCache: false });
  } catch (err) {
    console.error('[Notes] getNotes error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve notes.' });
  }
};

const createNote = [
  ...noteValidation,
  validate,
  async (req, res) => {
    try {
      const { sub } = req.user;
      const { title, content, tags, color } = req.body;

      const note = await Note.create({
        ownerSub: sub,
        title,
        content: content || '',
        tags: tags || [],
        color: color || 'default',
      });

      await incrementUserCacheVersion(sub);

      res.status(201).json({ note });
    } catch (err) {
      console.error('[Notes] createNote error:', err.message);
      res.status(500).json({ error: 'Failed to create note.' });
    }
  },
];

const updateNote = [
  param('id').isMongoId().withMessage('Invalid note ID.'),
  ...noteValidation,
  validate,
  async (req, res) => {
    try {
      const { sub } = req.user;
      const { title, content, tags, color } = req.body;

      const note = await Note.findOneAndUpdate(
        { _id: req.params.id, ownerSub: sub }, // ownership enforced
        { title, content, tags, color },
        { new: true, runValidators: true }
      );

      if (!note) {
        return res.status(404).json({ error: 'Note not found.' });
      }

      await incrementUserCacheVersion(sub);

      res.json({ note });
    } catch (err) {
      console.error('[Notes] updateNote error:', err.message);
      res.status(500).json({ error: 'Failed to update note.' });
    }
  },
];

const deleteNote = [
  param('id').isMongoId().withMessage('Invalid note ID.'),
  validate,
  async (req, res) => {
    try {
      const { sub } = req.user;

      const note = await Note.findOneAndDelete({ _id: req.params.id, ownerSub: sub });

      if (!note) {
        return res.status(404).json({ error: 'Note not found.' });
      }

      await incrementUserCacheVersion(sub);

      res.json({ message: 'Note deleted.' });
    } catch (err) {
      console.error('[Notes] deleteNote error:', err.message);
      res.status(500).json({ error: 'Failed to delete note.' });
    }
  },
];

const pinNote = [
  param('id').isMongoId().withMessage('Invalid note ID.'),
  validate,
  async (req, res) => {
    try {
      const { sub } = req.user;

      const note = await Note.findOne({ _id: req.params.id, ownerSub: sub });

      if (!note) {
        return res.status(404).json({ error: 'Note not found.' });
      }

      note.isPinned = !note.isPinned;
      await note.save();

      await incrementUserCacheVersion(sub);

      res.json({ note });
    } catch (err) {
      console.error('[Notes] pinNote error:', err.message);
      res.status(500).json({ error: 'Failed to update pin status.' });
    }
  },
];

module.exports = { getNotes, createNote, updateNote, deleteNote, pinNote };
