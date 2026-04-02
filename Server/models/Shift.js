const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date },
  endTime: { type: Date },
  date: { type: String },
  // ✅ FIX: logoutTime was missing from schema but used in all queries
  logoutTime: { type: String, default: 'Ongoing' },
  path: [{
    latitude: Number,
    longitude: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  notes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }],
  createdAt: { type: Date, default: Date.now }
});

// Index for fast active-shift lookups
ShiftSchema.index({ userId: 1, logoutTime: 1 });

module.exports = mongoose.model('Shift', ShiftSchema);