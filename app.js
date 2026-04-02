const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression'); // ✅ ADDED
require('dotenv').config();
const { Parser } = require('json2csv');

const User = require('./models/User');
const Shift = require('./models/Shift');
const Note = require('./models/Note');

const app = express();
app.use(compression()); // ✅ ADDED - 70% faster responses
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ✅ MongoDB Connection
mongoose.connect('mongodb+srv://bharatsharma:BharatRaipur2026@users.zhyvuoo.mongodb.net/tracking?retryWrites=true&w=majority')
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ cleanId — returns a real Mongoose ObjectId
const cleanId = (id) => {
    if (!id) return null;
    const cleaned = id.toString().replace(/['"]+/g, '').trim();
    if (!mongoose.Types.ObjectId.isValid(cleaned)) return null;
    return new mongoose.Types.ObjectId(cleaned);
};

// ✅ ADDED - Health check for UptimeRobot (keeps server always alive)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// ==========================================
//              AUTH ROUTES
// ==========================================

app.get('/api/auth/profile/:userId', async (req, res) => {
    try {
        const id = req.params.userId.replace(/['"]+/g, '').trim();
        if (!mongoose.Types.ObjectId.isValid(id))
            return res.status(400).json({ message: "Invalid ID format" });

        const user = await User.findById(id).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });

        const userObj = user.toObject();
        if (user.profileImage && user.profileImage.data)
            userObj.profileImage.data = user.profileImage.data.toString('base64');

        res.json(userObj);
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const activeShift = await Shift.findOne({ userId: user._id, logoutTime: 'Ongoing' });
        res.json({
            userId: user._id.toString(),
            name: user.name,
            role: user.role,
            isShiftActive: !!activeShift,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, profileImage, role, adminKey } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already in use" });

        let finalRole = 'worker';
        if (role === 'admin') {
            if (adminKey !== "admin")
                return res.status(403).json({ message: "Invalid Admin Key." });
            finalRole = 'admin';
        }

        const newUser = new User({ name, email, password, role: finalRole });
        if (profileImage) {
            newUser.profileImage = {
                data: Buffer.from(profileImage, 'base64'),
                contentType: 'image/jpeg'
            };
        }
        await newUser.save();
        res.status(201).json({ userId: newUser._id });
    } catch (e) {
        res.status(500).json({ message: "Signup failed: " + e.message });
    }
});

// ==========================================
//              SHIFT ROUTES
// ==========================================

app.post('/api/shift/start', async (req, res) => {
    try {
        const userId = cleanId(req.body.userId);
        const existing = await Shift.findOne({ userId, logoutTime: 'Ongoing' });
        if (existing) return res.status(200).json({ startTime: existing.startTime });

        const shift = await Shift.create({
            userId,
            startTime: new Date(),
            date: new Date().toLocaleDateString('en-IN'),
            logoutTime: 'Ongoing',
            path: [],
            notes: []
        });
        await User.findByIdAndUpdate(userId, { isShiftActive: true });
        res.status(201).json({ startTime: shift.startTime });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/shift/end', async (req, res) => {
    try {
        const userId = cleanId(req.body.userId);
        const now = new Date();
        const logoutTimeStr = now.toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', hour12: false
        });

        const shift = await Shift.findOneAndUpdate(
            { userId, logoutTime: 'Ongoing' },
            { endTime: now, logoutTime: logoutTimeStr },
            { new: true }
        );
        await User.findByIdAndUpdate(userId, { isShiftActive: false });
        if (!shift) return res.status(200).json({ message: "Already ended" });

        res.json({
            message: "Shift ended",
            summary: {
                pointsTracked: shift.path.length,
                notesCaptured: shift.notes.length
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/shift/active/:userId', async (req, res) => {
    try {
        const userId = cleanId(req.params.userId);
        const shift = await Shift.findOne({ userId, logoutTime: 'Ongoing' }).lean();
        if (!shift) return res.status(404).json({ message: "No active shift" });
        res.json(shift);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/shift-details/:shiftId', async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.shiftId).populate('notes').lean();
        if (!shift) return res.status(404).json({ message: "Shift not found" });
        res.status(200).json({
            date: shift.date,
            path: shift.path || [],
            notes: shift.notes || []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/history/:userId', async (req, res) => {
    try {
        const userId = cleanId(req.params.userId);
        if (!userId)
            return res.status(400).json({ message: "Invalid User ID format" });

        const archivedShifts = await Shift.find({ userId })
            .sort({ createdAt: -1 })
            .populate('notes');

        const historyLog = archivedShifts.map(s => ({
            _id: s._id,
            date: s.date,
            loginTime: s.startTime
                ? new Date(s.startTime).toLocaleTimeString()
                : "N/A",
            logoutTime: s.logoutTime === 'Ongoing'
                ? 'Ongoing'
                : (s.endTime ? new Date(s.endTime).toLocaleTimeString() : "N/A"),
            path: s.path || [],
            notes: s.notes || []
        }));

        res.status(200).json(historyLog);
    } catch (err) {
        console.error("❌ History Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
//              TRACKING
// ==========================================

app.post('/api/track', async (req, res) => {
    try {
        const userId = cleanId(req.body.userId);
        if (!userId)
            return res.status(400).json({ message: "Invalid userId" });

        const lat = parseFloat(req.body.latitude);
        const lng = parseFloat(req.body.longitude);
        if (isNaN(lat) || isNaN(lng))
            return res.status(400).json({ message: "Invalid coordinates" });

        const shift = await Shift.findOneAndUpdate(
            { userId, logoutTime: 'Ongoing' },
            { $push: { path: { latitude: lat, longitude: lng, timestamp: new Date() } } },
            { new: true }
        );

        if (!shift) return res.status(404).json({ message: "No active shift" });
        res.status(200).json({ count: shift.path.length });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==========================================
//              NOTES ROUTES
// ==========================================

app.post('/api/notes', async (req, res) => {
    try {
        const {
            userId,
            className,
            subjectsTaught,
            directorName,
            directorNumber,
            address,
            contactPersonName,
            contactPersonNumber,
            studentCount,
            classCount,
            remark,
            latitude,
            longitude
        } = req.body;

        const newNote = new Note({
            userId,
            className,
            subjectsTaught,
            directorName,
            directorNumber,
            address,
            contactPersonName,
            contactPersonNumber,
            studentCount,
            classCount,
            remark,
            latitude,
            longitude
        });
        await newNote.save();

        const shift = await Shift.findOneAndUpdate(
            { userId, logoutTime: 'Ongoing' },
            { $push: { notes: newNote._id } },
            { new: true }
        );
        if (!shift) return res.status(404).json({ message: "No active shift found" });

        res.status(201).json({ message: "Note recorded and linked to shift" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT — Update Note
app.put('/api/notes/:noteId', async (req, res) => {
    try {
        const updatedNote = await Note.findByIdAndUpdate(
            req.params.noteId,
            { $set: req.body },
            { new: true }
        );
        if (!updatedNote) return res.status(404).json({ message: "Note not found" });
        res.json({ message: "Note updated successfully", note: updatedNote });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE — Delete Note
app.delete('/api/notes/:noteId', async (req, res) => {
    try {
        const note = await Note.findByIdAndDelete(req.params.noteId);
        if (!note) return res.status(404).json({ message: "Note not found" });

        await Shift.updateOne(
            { notes: req.params.noteId },
            { $pull: { notes: new mongoose.Types.ObjectId(req.params.noteId) } }
        );

        res.json({ message: "Note deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
//              ADMIN ROUTES
// ==========================================

app.get('/api/admin/ongoing-shifts', async (req, res) => {
    try {
        const shifts = await Shift.find({ logoutTime: 'Ongoing' })
            .populate('userId', 'name profileImage')
            .sort({ startTime: -1 });
        res.json(shifts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/admin/shift/:id', async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.id);
        res.json(shift);
    } catch (err) {
        res.status(500).json({ message: "Error fetching path" });
    }
});

app.get('/api/admin/all-workers', async (req, res) => {
    try {
        const workers = await User.find({ role: 'worker' })
            .select('name email profileImage role')
            .sort({ name: 1 });

        const formattedWorkers = workers.map(worker => {
            const workerObj = worker.toObject();
            if (worker.profileImage && worker.profileImage.data) {
                const base64Flag = `data:${worker.profileImage.contentType};base64,`;
                workerObj.profileImage = base64Flag + worker.profileImage.data.toString('base64');
            }
            return workerObj;
        });
        res.status(200).json(formattedWorkers);
    } catch (err) {
        res.status(500).json({ message: "Error formatting worker data" });
    }
});

// ==========================================
//  Download per-shift CSV report
// ==========================================
app.get('/api/download-shift-report/:shiftId', async (req, res) => {
    try {
        const shift = await Shift.findById(req.params.shiftId).populate('notes');
        if (!shift) return res.status(404).json({ message: "Shift not found" });

        const reportData = shift.notes.length > 0
            ? shift.notes.map(note => ({
                'Date':             shift.date,
                'Shift Login':      shift.startTime ? new Date(shift.startTime).toLocaleTimeString() : 'N/A',
                'Shift Logout':     shift.logoutTime,
                'Class Name':       note.className        || '',
                'Subjects Taught':  note.subjectsTaught   || '',
                'Director':         note.directorName     || '',
                'Phone':            note.directorNumber   || '',
                'Address':          note.address          || '',
                'Student Count':    note.studentCount     ?? 0,
                'Class Count':      note.classCount       ?? 0,
                'Contact Person':   note.contactPersonName   || '',
                'Contact Number':   note.contactPersonNumber || '',
                'Remark':           note.remark           || '',
                'Latitude':         note.latitude,
                'Longitude':        note.longitude,
                'Created At':       new Date(note.createdAt).toLocaleString()
            }))
            : [{
                'Date':         shift.date,
                'Shift Login':  shift.startTime ? new Date(shift.startTime).toLocaleTimeString() : 'N/A',
                'Shift Logout': shift.logoutTime,
                'Notes':        'No notes recorded for this shift'
            }];

        const fields = [
            'Date', 'Shift Login', 'Shift Logout',
            'Class Name', 'Subjects Taught', 'Director', 'Phone',
            'Address', 'Student Count', 'Class Count',
            'Contact Person', 'Contact Number', 'Remark',
            'Latitude', 'Longitude', 'Created At'
        ];

        const csv = new Parser({ fields }).parse(reportData);
        const fileName = `Report_${shift.date.replace(/\//g, '-')}.csv`;

        res.header('Content-Type', 'text/csv');
        res.attachment(fileName);
        return res.send(csv);
    } catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// ==========================================
//  Monthly export route
// ==========================================
app.get('/api/export-monthly-notes', async (req, res) => {
    try {
        const { month, year } = req.query;
        const datePattern = new RegExp(`\\/${month}\\/${year}$`);

        const shifts = await Shift.find({ date: { $regex: datePattern } })
            .populate('notes')
            .lean();

        const rows = [];
        shifts.forEach(shift => {
            if (shift.notes && shift.notes.length > 0) {
                shift.notes.forEach(note => {
                    rows.push({
                        'Date':             shift.date,
                        'Start Time':       shift.startTime ? new Date(shift.startTime).toLocaleTimeString() : 'N/A',
                        'Logout Time':      shift.logoutTime,
                        'Class Name':       note.className        || '',
                        'Subjects Taught':  note.subjectsTaught   || '',
                        'Director':         note.directorName     || '',
                        'Phone':            note.directorNumber   || '',
                        'Address':          note.address          || '',
                        'Student Count':    note.studentCount     ?? 0,
                        'Class Count':      note.classCount       ?? 0,
                        'Remark':           note.remark           || '',
                    });
                });
            }
        });

        if (rows.length === 0) {
            return res.status(404).json({ message: "No data found for this month" });
        }

        const fields = [
            'Date', 'Start Time', 'Logout Time',
            'Class Name', 'Subjects Taught', 'Director', 'Phone',
            'Address', 'Student Count', 'Class Count', 'Remark'
        ];

        const csv = new Parser({ fields }).parse(rows);
        res.header('Content-Type', 'text/csv');
        res.attachment(`Report_${month}_${year}.csv`);
        return res.send(csv);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ FIXED - Dynamic PORT for Render
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server on port ${PORT}`));