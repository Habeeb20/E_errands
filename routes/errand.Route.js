import express from 'express';
import axios from 'axios';
import Errand from '../models/errand/errandSchema.js';
import Notification from '../models/errand/notification.js';
import Profile from '../models/Auth/profile.js';
import { verifyToken } from '../middleware/verifyToken.js';

const errandRoute = express.Router();

// Calculate Fare
errandRoute.post('/calculate-fare', async (req, res) => {
  const { pickupAddress, destinationAddress } = req.body;

  if (!pickupAddress || !destinationAddress) {
    return res.status(400).json({ status: false, message: 'Pickup and destination addresses are required' });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyB58m9sAWsgdU4LjZO4ha9f8N11Px7aeps'; 
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
      pickupAddress
    )}&destinations=${encodeURIComponent(destinationAddress)}&units=metric&key=${apiKey}`;

    const response = await axios.get(url);
    const data = response.data;
    console.log('Google Maps API Response:', data);

    if (data.status !== 'OK') {
      return res.status(400).json({
        status: false,
        message: `API Error: ${data.status}`,
        details: data.error_message || 'Unknown error',
      });
    }

    const element = data.rows[0]?.elements[0];
    if (!element || element.status !== 'OK') {
      return res.status(400).json({
        status: false,
        message: 'Unable to calculate distance',
        details: element?.status || 'No route data available',
      });
    }

    const distanceInMeters = element.distance.value;
    const distanceInKm = distanceInMeters / 1000;

    const baseFare = 500;
    const ratePerKm = 100;
    const fare = baseFare + distanceInKm * ratePerKm;

    return res.status(200).json({
      status: true,
      distance: distanceInKm.toFixed(2),
      fare: Math.round(fare),
    });
  } catch (error) {
    console.error('Error calculating fare:', error.response?.data || error.message);
    return res.status(500).json({
      status: false,
      message: 'An error occurred while calculating fare',
      error: error.message,
    });
  }
});

// Create an Errand
errandRoute.post('/create', verifyToken, async (req, res) => {
  const {
    erranderProfileId, // The frontend sends the errander's profile ID
    pickupAddress,
    destinationAddress,
    packageDescription,
    packagePicture,
    distance,
    calculatedPrice,
    paymentMethod,
  } = req.body;

  try {
    // Get the clientId from the authenticated user (from token)
    const clientId = req.user.id;

    // Fetch the client's profile
    const clientProfile = await Profile.findOne({ userId: clientId });
    if (!clientProfile) {
      return res.status(404).json({ status: false, message: 'Client profile not found' });
    }

    // Fetch the errander's profile and userId
    const erranderProfile = await Profile.findById(erranderProfileId).populate('userId');
    if (!erranderProfile) {
      return res.status(404).json({ status: false, message: 'Errander profile not found' });
    }
    const erranderId = erranderProfile.userId._id;

    // Create the errand
    const errand = new Errand({
      clientId, // From authenticated user
      erranderId:erranderProfile._id, 
      client: clientProfile._id, 
      errander: erranderProfileId, 
      pickupAddress,
      destinationAddress,
      packageDescription,
      packagePicture,
      distance,
      calculatedPrice,
      paymentMethod,
    });

    await errand.save();

    // Notify the errander
    const notification = new Notification({
      userId: erranderId,
      message: `You have a new errand request from ${clientId.firstName}`,
      errandId: errand._id,
    });
    await notification.save();

    // Emit Socket.IO events
    req.io.to(erranderId.toString()).emit('newErrand', errand);
    req.io.to(erranderId.toString()).emit('notification', notification);

    res.status(201).json({ status: true, errand });
  } catch (error) {
    console.error('Error creating errand:', error);
    res.status(500).json({ status: false, message: error.message });
  }
});

// Accept an Errand
errandRoute.post('/:id/accept', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const errand = await Errand.findById(id);
    if (!errand) return res.status(404).json({ status: false, message: 'Errand not found' });

    // Verify that the authenticated user is the errander
    const erranderId = req.user.id;
    if (errand.erranderId.toString() !== erranderId) {
      return res.status(403).json({ status: false, message: 'Unauthorized to accept this errand' });
    }

    errand.status = 'accepted';
    await errand.save();

    // Notify the client
    const notification = new Notification({
      userId: errand.clientId,
      message: `Your errand has been accepted by ${erranderId}`,
      errandId: errand._id,
    });
    await notification.save();

    req.io.to(errand.clientId.toString()).emit('errandUpdate', errand);
    req.io.to(errand.clientId.toString()).emit('notification', notification);

    res.status(200).json({ status: true, errand });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// Reject an Errand
errandRoute.post('/:id/reject', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const errand = await Errand.findById(id);
    if (!errand) return res.status(404).json({ status: false, message: 'Errand not found' });

    // Verify that the authenticated user is the errander
    const erranderId = req.user.id;
    if (errand.erranderId.toString() !== erranderId) {
      return res.status(403).json({ status: false, message: 'Unauthorized to reject this errand' });
    }

    errand.status = 'cancelled';
    await errand.save();

    // Notify the client
    const notification = new Notification({
      userId: errand.clientId,
      message: `Your errand has been rejected by ${erranderId}`,
      errandId: errand._id,
    });
    await notification.save();

    req.io.to(errand.clientId.toString()).emit('errandUpdate', errand);
    req.io.to(errand.clientId.toString()).emit('notification', notification);

    res.status(200).json({ status: true, errand });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// Start an Errand
errandRoute.post('/:id/start', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const errand = await Errand.findById(id);
    if (!errand) return res.status(404).json({ status: false, message: 'Errand not found' });

    // Verify that the authenticated user is the errander
    const erranderId = req.user.id;
    if (errand.erranderId.toString() !== erranderId) {
      return res.status(403).json({ status: false, message: 'Unauthorized to start this errand' });
    }

    errand.status = 'in_progress';
    await errand.save();

    // Notify the client
    const notification = new Notification({
      userId: errand.clientId,
      message: `Your errand has started!`,
      errandId: errand._id,
    });
    await notification.save();

    req.io.to(errand.clientId.toString()).emit('errandUpdate', errand);
    req.io.to(errand.clientId.toString()).emit('notification', notification);

    // Simulate errander movement (for demo purposes)
    let position = { lat: 6.5244, lng: 3.3792 }; // Starting point (Lagos coordinates)
    const interval = setInterval(() => {
      position.lat += 0.001; // Simulate movement
      position.lng += 0.001;
      req.io.to(errand.clientId.toString()).emit('erranderLocation', { errandId: id, position });

      // Stop simulation after reaching a certain point (for demo)
      if (position.lat > 6.5344) {
        clearInterval(interval);
      }
    }, 5000); // Update every 5 seconds

    res.status(200).json({ status: true, errand });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// Complete an Errand
errandRoute.post('/:id/complete', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const errand = await Errand.findById(id);
    if (!errand) return res.status(404).json({ status: false, message: 'Errand not found' });

    // Verify that the authenticated user is the errander
    const erranderId = req.user.id;
    if (errand.erranderId.toString() !== erranderId) {
      return res.status(403).json({ status: false, message: 'Unauthorized to complete this errand' });
    }

    errand.status = 'completed';
    await errand.save();

    // Notify the client
    const notification = new Notification({
      userId: errand.clientId,
      message: `Your errand has been completed!`,
      errandId: errand._id,
    });
    await notification.save();

    req.io.to(errand.clientId.toString()).emit('errandUpdate', errand);
    req.io.to(errand.clientId.toString()).emit('notification', notification);

    res.status(200).json({ status: true, errand });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// Cancel an Errand (by Client)
errandRoute.post('/:id/cancel', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const errand = await Errand.findById(id);
    if (!errand) return res.status(404).json({ status: false, message: 'Errand not found' });

    // Verify that the authenticated user is the client
    const clientId = req.user.id;
    if (errand.clientId.toString() !== clientId) {
      return res.status(403).json({ status: false, message: 'Unauthorized to cancel this errand' });
    }

    errand.status = 'cancelled';
    await errand.save();

    // Notify the errander
    const notification = new Notification({
      userId: errand.erranderId,
      message: `The errand has been cancelled by the client`,
      errandId: errand._id,
    });
    await notification.save();

    req.io.to(errand.erranderId.toString()).emit('errandUpdate', errand);
    req.io.to(errand.erranderId.toString()).emit('notification', notification);

    res.status(200).json({ status: true, errand });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// Get Errand History for a User (Client or Errander)
errandRoute.get('/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

   
    const errandsAsClient = await Errand.find({ clientId: userId })
      .populate('clientId', 'firstName lastName email phone uniqueNumber') // Populate client details
      .populate('client', 'profilePicture') // Populate client profile picture
      .populate('erranderId', 'firstName lastName email phone uniqueNumber') // Populate errander details
      .populate('errander', 'profilePicture'); // Populate errander profile picture

    const errandsAsErrander = await Errand.find({ erranderId: userId })
      .populate('clientId', 'firstName lastName email phone uniqueNumber') // Populate client details
      .populate('client', 'profilePicture') // Populate client profile picture
      .populate('erranderId', 'firstName lastName email phone uniqueNumber') // Populate errander details
      .populate('errander', 'profilePicture'); // Populate errander profile picture

    const history = [...errandsAsClient, ...errandsAsErrander];

    res.status(200).json({ status: true, history });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// Get Notifications for a User
errandRoute.get('/notifications', verifyToken, async (req, res) => {
  try {
    const id = req.user.id; // Get userId from authenticated user

    const notificationsErrander = await Notification.find({ erranderId: id }).populate("erranderId", 'firstName lastName email phone uniqueNumber').sort({ createdAt: -1 });
    const notificationsClient = await Notification.find({ userId: id }).populate("userId", 'firstName lastName email phone uniqueNumber').sort({ createdAt: -1 });

    const notifications = [...notificationsClient, ...notificationsErrander]
    res.status(200).json({ status: true, notifications });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});



export default errandRoute;