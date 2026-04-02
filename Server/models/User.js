const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'worker'], 
        default: 'worker' 
    },
    faceDescriptor: { type: [Number], default: [] }, 
    profileImage: { 
        data: Buffer, 
        contentType: String 
    },
    isShiftActive: { type: Boolean, default: false },
    shiftStartTime: { type: Date },
    locationHistory: [{ 
        latitude: { type: Number, required: true }, 
        longitude: { type: Number, required: true }, 
        timestamp: { type: Date, default: Date.now } 
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);