// const mongoose = require('mongoose');

// const NoteSchema = new mongoose.Schema({
//   userId: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true 
//   },
//   text: { type: String, required: true },
//   latitude: { type: Number, required: true },
//   longitude: { type: Number, required: true },
//   createdAt: { type: Date, default: Date.now }
// });

// const mongoose = require('mongoose');

// const NoteSchema = new mongoose.Schema({
//   userId: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true 
//   },
//   className: { type: String, required: true },
//   directorName: String,
//   directorNumber: String,
//   address: String,
//   contactPersonName: String,
//   contactPersonNumber: String,
//   studentCount: { type: Number, default: 0 }, 
//   classCount: { type: Number, default: 0 },
//   latitude: { type: Number, required: true },
//   longitude: { type: Number, required: true },
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('Note', NoteSchema);


// const mongoose = require('mongoose');

// const NoteSchema = new mongoose.Schema({
//   userId: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'User', 
//     required: true 
//   },
//   className: { type: String, required: true },
//   directorName: String,
//   directorNumber: String,
//   address: String,
//   contactPersonName: String,
//   contactPersonNumber: String,
//   studentCount: { type: Number, default: 0 }, 
//   classCount: { type: Number, default: 0 },
//   latitude: { type: Number, required: true },
//   longitude: { type: Number, required: true },
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('Note', NoteSchema);

// // PUT - Update Note
// app.put('/api/notes/:noteId', async (req, res) => {
//   try {
//     const { noteId } = req.params;
//     const { text } = req.body;

//     if (!text || text.trim() === "") {
//       return res.status(400).json({ message: "Note cannot be empty" });
//     }

//     const shift = await Shift.findOne({ "notes._id": noteId });

//     if (!shift) return res.status(404).json({ message: "Note not found" });

//     const note = shift.notes.id(noteId);
//     note.text = text;

//     await shift.save();

//     res.json({ message: "Note updated successfully" });

//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // DELETE - Delete Note
// app.delete('/api/notes/:noteId', async (req, res) => {
//   try {
//     const { noteId } = req.params;

//     const shift = await Shift.findOne({ "notes._id": noteId });

//     if (!shift) return res.status(404).json({ message: "Note not found" });

//     shift.notes = shift.notes.filter(
//       (note) => note._id.toString() !== noteId
//     );

//     await shift.save();

//     res.json({ message: "Note deleted successfully" });

//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });



const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // ── Class / Institute ─────────────────────────────
    className: {
        type: String,
        required: true
    },
    subjectsTaught: {          // ✅ ADDED — was missing, caused blank Excel column
        type: String,
        default: ''
    },

    // ── Director / Contact ────────────────────────────
    directorName: {
        type: String,
        default: ''
    },
    directorNumber: {
        type: String,
        default: ''
    },
    contactPersonName: {
        type: String,
        default: ''
    },
    contactPersonNumber: {
        type: String,
        default: ''
    },

    // ── Location / Address ────────────────────────────
    address: {
        type: String,
        default: ''
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },

    // ── Stats ─────────────────────────────────────────
    studentCount: {
        type: Number,
        default: 0
    },
    classCount: {
        type: Number,
        default: 0
    },

    // ── Extra ─────────────────────────────────────────
    remark: {                  // ✅ ADDED — was missing
        type: String,
        default: ''
    }

}, { timestamps: true });

module.exports = mongoose.model('Note', NoteSchema);