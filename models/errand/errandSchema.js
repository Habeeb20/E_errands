import mongoose from "mongoose";

const errandSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    erranderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    errander: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    pickupAddress: { type: String, required: true },
    destinationAddress: { type: String, required: true },
    pickupCoords: {
      lat: { type: Number },
      lng: { type: Number },
    },
    destinationCoords: {
      lat: { type: Number },
      lng: { type: Number },
    },
    packageDescription: { type: String, required: true },
    packagePicture: { type: String },
    distance: { type: Number, required: true },
    calculatedPrice: { type: Number, required: true },
    paymentMethod: { type: String, required: true, enum: ['cash', 'transfer'] },
    status: { type: String, default: 'pending', enum: ['pending', 'accepted', 'in_progress', 'completed', 'rejected'] },
    createdAt: { type: Date, default: Date.now },
})

export default mongoose.model("Errand", errandSchema)


















