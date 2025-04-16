import mongoose from "mongoose";

const errandSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    erranderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    errander: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: false },
    pickupAddress: { type: String, required: true },
    destinationAddress: { type: String, required: true },
    packageDescription: { type: String, required: true },
    packagePicture: { type: String, required: false },
    distance: { type: Number, required: true },
    calculatedPrice: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'transfer'], required: true },
    status: { type: String, enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'negotiating'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
})

export default mongoose.model("Errand", errandSchema)