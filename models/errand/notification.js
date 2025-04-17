import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  erranderId:{type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  message: { type: String, required: true },
  errandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Errand', required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Notification', notificationSchema);