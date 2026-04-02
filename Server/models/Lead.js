const mongoose = require('mongoose');

// Schema for Lead Management
const LeadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference logic
  referenceName: { type: String },
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

const Lead = mongoose.model('Lead', LeadSchema);

module.exports = { Lead };