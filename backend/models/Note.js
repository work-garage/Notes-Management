const mongoose = require('mongoose');

const VALID_COLORS = ['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'teal'];

const noteSchema = new mongoose.Schema(
  {
    ownerSub: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 50000,
      default: '',
    },
    tags: {
      type: [String],
      validate: {
        validator: (v) => v.length <= 10,
        message: 'A note can have at most 10 tags.',
      },
      default: [],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      enum: VALID_COLORS,
      default: 'default',
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Trim individual tags and enforce per-tag length
noteSchema.pre('save', function (next) {
  this.tags = this.tags
    .map((t) => t.trim().slice(0, 50))
    .filter((t) => t.length > 0);
  next();
});

// Index for efficient per-user listing sorted by pinned + updatedAt
noteSchema.index({ ownerSub: 1, isPinned: -1, updatedAt: -1 });

const Note = mongoose.model('Note', noteSchema);

module.exports = { Note, VALID_COLORS };
