import { verifyToken } from "../middleware/verifyToken.js";
import Profile from "../models/Auth/profile.js";
import User from "../models/user.js";
import express from "express"
import Message from "../models/messenger/message.js";
import cloudinary from "cloudinary"
import io from "../index.js";
// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const messageRouter = express.Router()


messageRouter.post('/', verifyToken, async (req, res) => {
    try {
        const {
            pickupLocation,
            dropoffLocation,
            item,
            quantity,
            isOrder,
            needsIdCard,
            gender,
            isPersonal,
            pickupTime,
            pickupDate,
            personnelPhone,
            needsCar,
            vehicleType,
            picture,
            picture1,
            isPerishable
        } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if(user.role === "errander" || user.role === "messenger"){
            return res.status(400).json({
                message:"errander or messenger is not allowed to perform this action",
                status: false
            })
        }

        const profile = await Profile.findOne({userId: user._id})

        
        const request = new Message({
            clientId: req.user.id,
          
            pickupLocation,
            dropoffLocation,
            item,
            quantity,
            isOrder,
            needsIdCard,
            gender,
            isPersonal,
            pickupTime,
            pickupDate: new Date(pickupDate),
            personnelPhone,
            needsCar,
            vehicleType,
            picture,
            picture1,
            isPerishable
        });

        await request.save();
        io.emit('newRequest', request._id);
        res.status(201).json(request);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating request', error: error.message });
    }
});



messageRouter.get('/', verifyToken, async (req, res) => {
    try {
        const requests = await Message.find({
            $or: [
                { clientId: req.user.id },
                { erranderId: req.user.id },
                { status: 'pending' }
            ]
        }).populate('clientId erranderId  errander');
        res.json(requests);
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Error fetching requests', error });
    }
});

messageRouter.post('/:id/bid', verifyToken, async (req, res) => {
    try {
        const { price } = req.body;
        const request = await Message.findById(req.params.id);
        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Request is no longer accepting bids' });
        }
        request.bids.push({
            erranderId: req.user.id,
            erranderProfile: req.user.profileId,
            price
        });
        await request.save();
        io.emit('submitBid', { requestId: request._id, erranderId: req.user.id, price });
        res.json(request);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting bid', error });
    }
});

messageRouter.post('/:id/accept-bid/:bidId', verifyToken, async (req, res) => {
    try {
        const request = await Message.findById(req.params.id);
        if (request.clientId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const bid = request.bids.id(req.params.bidId);
        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }
        bid.status = 'accepted';
        request.bids.forEach(b => {
            if (b._id.toString() !== req.params.bidId) b.status = 'rejected';
        });
        request.erranderId = bid.erranderId;
        request.errander = bid.erranderProfile;
        request.status = 'accepted';
        await request.save();
        io.emit('acceptBid', { requestId: request._id, bidId: req.params.bidId });
        res.json(request);
    } catch (error) {
        res.status(500).json({ message: 'Error accepting bid', error });
    }
});

messageRouter.post('/:id/message', verifyToken, async (req, res) => {
    try {
        const { message } = req.body;
        const request = await Message.findById(req.params.id);
        if (request.clientId.toString() !== req.user.id && request.erranderId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        request.chatMessages.push({ senderId: req.user.id, message });
        await request.save();
        io.emit('sendMessage', { requestId: request._id, senderId: req.user.id, message });
        res.json(request);
    } catch (error) {
        res.status(500).json({ message: 'Error sending message', error });
    }
});

messageRouter.post('/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        const request = await Message.findById(req.params.id);
        if (request.erranderId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        request.status = status;
        await request.save();
        io.emit('updateRequestStatus', { requestId: request._id, status });
        res.json(request);
    } catch (error) {
        res.status(500).json({ message: 'Error updating status', error });
    }
});

messageRouter.post('/:id/cancel', verifyToken, async (req, res) => {
    try {
        const { reason } = req.body;
        const request = await Message.findById(req.params.id);
        if (request.clientId.toString() !== req.user.id && request.erranderId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        request.status = 'cancelled';
        request.cancellation = {
            reason,
            cancelledBy: request.clientId.toString() === req.user.id ? 'client' : 'errander',
            cancelledAt: new Date()
        };
        await request.save();
        io.emit('cancelRequest', {
            requestId: request._id,
            reason,
            cancelledBy: request.clientId.toString() === req.user.id ? 'client' : 'errander'
        });
        res.json(request);
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling request', error });
    }
});

export default messageRouter