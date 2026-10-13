const express = require('express');
const authenticateCognito = require('../middleware/authenticateCognito');
const {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  pinNote,
} = require('../controllers/noteController');

const router = express.Router();

// All note routes require authentication
router.use(authenticateCognito);

router.get('/', getNotes);
router.post('/', createNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);
router.patch('/:id/pin', pinNote);

module.exports = router;
