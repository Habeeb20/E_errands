import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    erranderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Populated when client accepts an errander
    // client: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    errander: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }, // Populated when client accepts an errander
    pickupLocation: { type: String, required: true },
    dropoffLocation: { type: String, required: true },
    quantity: { type: String, required: true },
    item: { type: String, required: true },
    isOrder: { type: Boolean, required: true },
    needsIdCard: { type: Boolean, required: true },
    gender: { type: String, required: true },
    isPersonal: { type: String, required: true }, // "personal" or "company"
    pickupTime: { type: String, required: true },
    pickupDate: { type: Date, required: true },
    personnelPhone: { type: String, required: true },
    needsCar: { type: Boolean, required: true },
    vehicleType: { type: String },
    picture: { type: String },
    picture1: { type: String },
    isPerishable: { type: Boolean, required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    bids: [{
        erranderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        erranderProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' },
        price: { type: Number, required: true },
        status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
        createdAt: { type: Date, default: Date.now }
    }],
    cancellation: {
        reason: { type: String },
        cancelledBy: { type: String, enum: ['client', 'errander'] },
        cancelledAt: { type: Date }
    },
    chatMessages: [{
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
    
}, { strictPopulate: false });

messageSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.model("Message", messageSchema);