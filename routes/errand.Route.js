import express from 'express';
import axios from 'axios';
import Errand from '../models/errand/errandSchema.js';
import Notification from '../models/errand/notification.js';
import Profile from '../models/Auth/profile.js';
import { verifyToken } from '../middleware/verifyToken.js';
import dotenv from "dotenv"


dotenv.config()
const errandRoute = express.Router();

// Calculate Fare
// errandRoute.post('/calculate-fare', async (req, res) => {
//   const { pickupAddress, destinationAddress } = req.body;

//   if (!pickupAddress || !destinationAddress) {
//     return res.status(400).json({ status: false, message: 'Pickup and destination addresses are required' });
//   }

//   try {
//     const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyB58m9sAWsgdU4LjZO4ha9f8N11Px7aeps'; 
//     const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
//       pickupAddress
//     )}&destinations=${encodeURIComponent(destinationAddress)}&units=metric&key=${apiKey}`;

//     const response = await axios.get(url);
//     const data = response.data;
//     console.log('Google Maps API Response:', data);

//     if (data.status !== 'OK') {
//       return res.status(400).json({
//         status: false,
//         message: `API Error: ${data.status}`,
//         details: data.error_message || 'Unknown error',
//       });
//     }

//     const element = data.rows[0]?.elements[0];
//     if (!element || element.status !== 'OK') {
//       return res.status(400).json({
//         status: false,
//         message: 'Unable to calculate distance',
//         details: element?.status || 'No route data available',
//       });
//     }

//     const distanceInMeters = element.distance.value;
//     const distanceInKm = distanceInMeters / 1000;

//     const baseFare = 500;
//     const ratePerKm = 100;
//     const fare = baseFare + distanceInKm * ratePerKm;

//     return res.status(200).json({
//       status: true,
//       distance: distanceInKm.toFixed(2),
//       fare: Math.round(fare),
//     });
//   } catch (error) {
//     console.error('Error calculating fare:', error.response?.data || error.message);
//     return res.status(500).json({
//       status: false,
//       message: 'An error occurred while calculating fare',
//       error: error.message,
//     });
//   }
// });






// Calculate fare endpoint
errandRoute.post("/calculate-fare", async (req, res) => {
  const { pickupAddress, destinationAddress } = req.body;
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  // Input validation
  if (!pickupAddress || !destinationAddress) {
    return res.status(400).json({
      status: false,
      message: "Pickup and destination addresses are required",
      data: null,
    });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({
      status: false,
      message: "Google Maps API key is not configured",
      data: null,
    });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
      pickupAddress
    )}&destinations=${encodeURIComponent(
      destinationAddress
    )}&units=metric&key=${GOOGLE_MAPS_API_KEY}`;

    console.log("Distance Matrix API URL:", url); // Debug log (remove in production)
    const response = await axios.get(url, { timeout: 5000 }); // Added timeout
    const data = response.data;
    console.log("Google Maps API Response:", data);

    if (data.status !== "OK") {
      return res.status(400).json({
        status: false,
        message: `Distance Matrix API Error: ${data.status}`,
        data: null,
        details: data.error_message || "Unknown error",
      });
    }

    const element = data.rows[0]?.elements[0];
    if (!element || element.status !== "OK") {
      return res.status(400).json({
        status: false,
        message: "Unable to calculate distance",
        data: null,
        details: element?.status || "No route data available",
      });
    }

    const distanceInMeters = element.distance.value;
    const distanceInKm = distanceInMeters / 1000;

    const baseFare = 500; // NGN
    const ratePerKm = 100; // NGN per km
    const fare = baseFare + distanceInKm * ratePerKm;

    return res.status(200).json({
      status: true,
      message: "Fare calculated successfully",
      data: {
        distance: distanceInKm.toFixed(2), // in km
        fare: Math.round(fare), // in NGN
      },
    });
  } catch (error) {
    console.error("Error calculating fare:", error.stack);
    return res.status(500).json({
      status: false,
      message: "An error occurred while calculating fare",
      data: null,
      error: process.env.NODE_ENV === "production" ? null : error.message,
    });
  }
});













errandRoute.post('/create', verifyToken, async (req, res) => {
  const {
    erranderProfileId,
    pickupAddress,
    destinationAddress,
    packageDescription,
    packagePicture,
    distance,
    calculatedPrice,
    paymentMethod,
  } = req.body;

  try {
    if (!erranderProfileId || !pickupAddress || !destinationAddress || !packageDescription || !distance || !calculatedPrice || !paymentMethod) {
      return res.status(400).json({ status: false, message: 'All required fields must be provided' });
    }

    if (isNaN(parseFloat(distance)) || isNaN(parseFloat(calculatedPrice))) {
      return res.status(400).json({ status: false, message: 'Distance and calculatedPrice must be valid numbers' });
    }

    const normalizedPaymentMethod = paymentMethod.toLowerCase();
    if (!['cash', 'card', 'transfer'].includes(normalizedPaymentMethod)) {
      return res.status(400).json({ status: false, message: 'Invalid payment method' });
    }

    const clientId = req.user.id;

    const clientProfile = await Profile.findOne({ userId: clientId });
    if (!clientProfile) {
      return res.status(404).json({ status: false, message: 'Client profile not found' });
    }

    const erranderProfile = await Profile.findById(erranderProfileId).populate('userId');
    if (!erranderProfile) {
      return res.status(404).json({ status: false, message: 'Errander profile not found' });
    }
    const erranderId = erranderProfile.userId._id;

    // Geocode pickup and destination addresses
    const geocodeAddress = async (address) => {
      try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            address,
            key: process.env.GOOGLE_MAPS_API_KEY,
          },
        });
        const { results, status } = response.data;
        if (status !== 'OK' || results.length === 0) {
          console.warn(`Geocoding failed for address: ${address}. Status: ${status}`);
          return null; // Return null instead of throwing an error
        }
        const { lat, lng } = results[0].geometry.location;
        return { lat, lng };
      } catch (error) {
        console.error(`Error geocoding address ${address}:`, error.message);
        return null;
      }
    };

    const pickupCoords = await geocodeAddress(pickupAddress);
    const destinationCoords = await geocodeAddress(destinationAddress);

    // Log the results for debugging
    console.log('Pickup Address:', pickupAddress, 'Coords:', pickupCoords);
    console.log('Destination Address:', destinationAddress, 'Coords:', destinationCoords);

    const errandData = {
      clientId,
      erranderId,
      client: clientProfile._id,
      errander: erranderProfileId,
      pickupAddress,
      destinationAddress,
      packageDescription,
      packagePicture,
      distance: parseFloat(distance),
      calculatedPrice: parseFloat(calculatedPrice),
      paymentMethod: normalizedPaymentMethod,
    };

    // Only add coordinates if geocoding was successful
    if (pickupCoords) errandData.pickupCoords = pickupCoords;
    if (destinationCoords) errandData.destinationCoords = destinationCoords;

    const errand = new Errand(errandData);
    await errand.save();

    const notification = new Notification({
      userId:erranderId,
      erranderId: clientId,
      message: `You have a new errand request from ${clientProfile.firstName}`,
      errandId: errand._id,
    });
    await notification.save();

    req.io.to(erranderId.toString()).emit('newErrand', errand);
    req.io.to(erranderId.toString()).emit('notification', notification);

    // Warn the client if geocoding failed
    if (!pickupCoords || !destinationCoords) {
      return res.status(201).json({
        status: true,
        errand,
        warning: 'Geocoding failed for one or both addresses. Coordinates were not saved.',
      });
    }

    res.status(201).json({ status: true, errand });
  } catch (error) {
    console.error('Error creating errand:', error);
    res.status(500).json({ status: false, message: error.message });
  }
});




// Accept an Errand
errandRoute.post('/:id/accept', verifyToken, async (req, res) => {
  try {
    const errandId = req.params.id;
    const erranderId = req.user.id; // From the verified token

    // Find the errand and ensure the errander is authorized
    const errand = await Errand.findById(errandId)
      .populate('clientId', 'firstName lastName')
      .populate('erranderId', 'firstName lastName');
    if (!errand) {
      return res.status(404).json({ status: false, message: 'Errand not found' });
    }
    if (errand.erranderId._id.toString() !== erranderId) {
      return res.status(403).json({ status: false, message: 'Unauthorized' });
    }
    if (errand.status !== 'pending') {
      return res.status(400).json({ status: false, message: 'Errand cannot be accepted' });
    }

    // Update the errand status
    errand.status = 'accepted';
    await errand.save();

    // Emit updates to both errander and client
    req.io.to(erranderId).emit('errandUpdate', errand);
    req.io.to(errand.clientId._id.toString()).emit('errandUpdate', errand);

    // Notify the client
    const notification = new Notification({
      
      erranderId: errand.clientId._id,
      message: `Your errand has been accepted by ${errand.erranderId.firstName} ${errand.erranderId.lastName}`,
      errandId: errand._id,
    });
    await notification.save();
    req.io.to(errand.clientId._id.toString()).emit('notification', notification);

    res.status(200).json({ status: true, errand });
  } catch (error) {
    console.error('Error accepting errand:', error);
    res.status(500).json({ status: false, message: error.message });
  }
});

// POST /api/errand/:id/reject - Reject an errand
errandRoute.post('/:id/reject', verifyToken, async (req, res) => {
  try {
    const errandId = req.params.id;
    const erranderId = req.user.id;

    const errand = await Errand.findById(errandId)
      .populate('clientId', 'firstName lastName')
      .populate('erranderId', 'firstName lastName');
    if (!errand) {
      return res.status(404).json({ status: false, message: 'Errand not found' });
    }
    if (errand.erranderId._id.toString() !== erranderId) {
      return res.status(403).json({ status: false, message: 'Unauthorized' });
    }
    if (errand.status !== 'pending') {
      return res.status(400).json({ status: false, message: 'Errand cannot be rejected' });
    }

    errand.status = 'rejected';
    await errand.save();

    req.io.to(erranderId).emit('errandUpdate', errand);
    req.io.to(errand.clientId._id.toString()).emit('errandUpdate', errand);

    const notification = new Notification({
      erranderId: errand.clientId._id,
      message: `Your errand has been rejected by ${errand.erranderId.firstName} ${errand.erranderId.lastName}`,
      errandId: errand._id,
    });
    await notification.save();
    req.io.to(errand.clientId._id.toString()).emit('notification', notification);

    res.status(200).json({ status: true, errand });
  } catch (error) {
    console.error('Error rejecting errand:', error);
    res.status(500).json({ status: false, message: error.message });
  }
});

// POST /api/errand/:id/start - Start an errand
errandRoute.post('/:id/start', verifyToken, async (req, res) => {
  try {
    const errandId = req.params.id;
    const erranderId = req.user.id;

    const errand = await Errand.findById(errandId)
      .populate('clientId', 'firstName lastName')
      .populate('erranderId', 'firstName lastName');
    if (!errand) {
      return res.status(404).json({ status: false, message: 'Errand not found' });
    }
    if (errand.erranderId._id.toString() !== erranderId) {
      return res.status(403).json({ status: false, message: 'Unauthorized' });
    }
    if(errand.status === "in_progress"){
      return res.status(400).json({status: false, message: "errand is already in progress"})
    }
    if (errand.status !== 'accepted') {
      return res.status(400).json({ status: false, message: 'Errand cannot be started' });
    }
    

    errand.status = 'in_progress';
    await errand.save();

    req.io.to(erranderId).emit('errandUpdate', errand);
    req.io.to(errand.clientId._id.toString()).emit('errandUpdate', errand);

    const notification = new Notification({
      erranderId: errand.clientId._id,
      message: `Your errand has started by ${errand.erranderId.firstName} ${errand.erranderId.lastName}`,
      errandId: errand._id,
    });
    await notification.save();
    req.io.to(errand.clientId._id.toString()).emit('notification', notification);

    res.status(200).json({ status: true, errand });
  } catch (error) {
    console.error('Error starting errand:', error);
    res.status(500).json({ status: false, message: error.message });
  }
});

// POST /api/errand/:id/complete - Complete an errand
errandRoute.post('/:id/complete', verifyToken, async (req, res) => {
  try {
    const errandId = req.params.id;
    const erranderId = req.user.id;

    const errand = await Errand.findById(errandId)
      .populate('clientId', 'firstName lastName')
      .populate('erranderId', 'firstName lastName');
    if (!errand) {
      return res.status(404).json({ status: false, message: 'Errand not found' });
    }
    if (errand.erranderId._id.toString() !== erranderId) {
      return res.status(403).json({ status: false, message: 'Unauthorized' });
    }
    if (errand.status !== 'in_progress') {
      return res.status(400).json({ status: false, message: 'Errand cannot be completed' });
    }

    errand.status = 'completed';
    await errand.save();

    req.io.to(erranderId).emit('errandUpdate', errand);
    req.io.to(errand.clientId._id.toString()).emit('errandUpdate', errand);

    const notification = new Notification({
      erranderId: errand.clientId._id,
      message: `Your errand has been completed by ${errand.erranderId.firstName} ${errand.erranderId.lastName}`,
      errandId: errand._id,
    });
    await notification.save();
    req.io.to(errand.clientId._id.toString()).emit('notification', notification);

    res.status(200).json({ status: true, errand });
  } catch (error) {
    console.error('Error completing errand:', error);
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


//get total earnings
errandRoute.get('/total-earnings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all completed errands where the user is the errander
    const completedErrands = await Errand.find({
      erranderId: userId,
      status: 'completed',
    });

    // Calculate the total earnings
    const totalEarnings = completedErrands.reduce((sum, errand) => {
      return sum + (errand.calculatedPrice || 0); // Use calculatedPrice, fallback to 0 if undefined
    }, 0);

    // Calculate 10% of total earnings
    const platformFee = totalEarnings * 0.1;

    res.status(200).json({
      status: true,
      totalEarnings,
      platformFee, // 10% of totalEarnings
      currency: 'NGN',
      completedErrandsCount: completedErrands.length,
    });
  } catch (error) {
    console.error('Error calculating total earnings:', error);
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