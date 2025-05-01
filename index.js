import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import connectDb from "./db.js";
import dotenv from "dotenv";
import morgan from "morgan";
import multer from "multer";
import userRoute from "./routes/userRoute.js";
import profileRoute from "./routes/profileRoute.js";
import errandRoute from "./routes/errand.Route.js";
import http from 'http';
import { Server } from 'socket.io';
import axios from "axios"
import cloudinary from "cloudinary"
import messageRouter from "./routes/messageRoute.js";
import Message from "./models/messenger/message.js";
dotenv.config();
connectDb();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST'],
  },
});

app.set("timeout", 60000);



// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId); // User joins a room with their ID
    console.log(`${userId} joined room`);
  });

  socket.on('joinUserRoom', (userId) => {
    socket.join(userId);
});

// Handle new request
socket.on('newRequest', async (requestId) => {
    const request = await Message.findById(requestId).populate('clientId ');
    io.emit('requestPosted', request); // Notify all erranders
});

// Handle bid submission
socket.on('submitBid', async ({ requestId, erranderId, price }) => {
    const request = await Message.findById(requestId);
    request.bids.push({ erranderId, erranderProfile: erranderId, price });
    await request.save();
    io.to(request.clientId.toString()).emit('newBid', request);
    io.emit('requestUpdated', request);
});

// Handle client accepting a bid
socket.on('acceptBid', async ({ requestId, bidId }) => {
    const request = await Message.findById(requestId);
    const bid = request.bids.id(bidId);
    bid.status = 'accepted';
    request.bids.forEach(b => {
        if (b._id.toString() !== bidId) b.status = 'rejected';
    });
    request.erranderId = bid.erranderId;
    request.errander = bid.erranderProfile;
    request.status = 'accepted';
    await request.save();
    io.to(bid.erranderId.toString()).emit('bidAccepted', request);
    io.to(request.clientId.toString()).emit('requestUpdated', request);
    io.emit('requestUpdated', request);
});

// Handle chat messages
socket.on('sendMessage', async ({ requestId, senderId, message }) => {
    const request = await Message.findById(requestId);
    request.chatMessages.push({ senderId, message });
    await request.save();
    io.to(request.clientId.toString()).emit('newMessage', request);
    io.to(request.erranderId.toString()).emit('newMessage', request);
});

// Handle request status updates
socket.on('updateRequestStatus', async ({ requestId, status }) => {
    const request = await Message.findById(requestId);
    request.status = status;
    await request.save();
    io.to(request.clientId.toString()).emit('requestUpdated', request);
    io.to(request.erranderId.toString()).emit('requestUpdated', request);
    io.emit('requestUpdated', request);
});

// Handle cancellation
socket.on('cancelRequest', async ({ requestId, reason, cancelledBy }) => {
    const request = await Message.findById(requestId);
    request.status = 'cancelled';
    request.cancellation = { reason, cancelledBy, cancelledAt: new Date() };
    await request.save();
    io.to(request.clientId.toString()).emit('requestUpdated', request);
    if (request.erranderId) {
        io.to(request.erranderId.toString()).emit('requestUpdated', request);
    }
    io.emit('requestUpdated', request);
});



  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

app.use((req, res, next) => {
  req.io = io;
  next();
});


const port = process.env.PORT || 8080


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(multer().any());
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, 
  }));

app.use(bodyParser.json());
app.use(morgan("dev"));

app.use("/api/auth", userRoute)
app.use("/api/profile", profileRoute)
app.use("/api/errand", errandRoute)
app.use("/api/requests", messageRouter)


app.get("/", (req, res) => {
    res.send("app is listening on port....")
  })












/////map routes******????????



// Geocode address using Nominatim (OpenStreetMap)
// app.post("/api/geocode", async (req, res) => {
//   const { address } = req.body;

//   if (!address) {
//     return res.status(400).json({
//       status: false,
//       message: "Address is required",
//     });
//   }

//   try {
//     const response = await axios.get(
//       `https://nominatim.openstreetmap.org/search`,
//       {
//         params: {
//           q: address,
//           format: "json",
//           limit: 1,
//         },
//         headers: {
//           "User-Agent": "YourAppName/1.0 (your-email@example.com)", // Nominatim requires a user agent
//         },
//       }
//     );

//     const data = response.data;
//     if (data.length === 0) {
//       return res.status(404).json({
//         status: false,
//         message: "Address not found",
//       });
//     }

//     const { lat, lon } = data[0];
//     res.status(200).json({
//       status: true,
//       data: {
//         lat: parseFloat(lat),
//         lng: parseFloat(lon),
//       },
//     });
//   } catch (error) {
//     console.error("Geocoding error:", error.message);
//     res.status(500).json({
//       status: false,
//       message: "Failed to geocode address",
//       error: error.message,
//     });
//   }
// });










// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a ride-specific room
  socket.on("joinRide", (rideId) => {
    socket.join(rideId);
    console.log(`User ${socket.id} joined ride ${rideId}`);
  });

  // Receive location updates from the driver
  socket.on("updateLocation", ({ rideId, position }) => {
    console.log(`Location update for ride ${rideId}:`, position);
    // Broadcast the location to all clients in the ride room
    io.to(rideId).emit("locationUpdate", position);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});


app.post("/api/geocode", async (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({
      status: false,
      message: "Address is required",
    });
  }

  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: {
          q: address,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "YourAppName/1.0 (your-email@example.com)", // Replace with your email
        },
      }
    );

    const data = response.data;
    if (data.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Address not found",
      });
    }

    const { lat, lon } = data[0];
    res.status(200).json({
      status: true,
      data: {
        lat: parseFloat(lat),
        lng: parseFloat(lon),
      },
    });
  } catch (error) {
    console.error("Geocoding error:", error.message);
    res.status(500).json({
      status: false,
      message: "Failed to geocode address",
      error: error.message,
    });
  }
});



// Fetch multiple routes using OSRM
app.post("/api/get-routes", async (req, res) => {
  const { start, end } = req.body;

  // Validate request body
  if (!start || !end || !start.lat || !start.lng || !end.lat || !end.lng) {
    return res.status(400).json({
      status: false,
      message: "Start and end coordinates are required",
    });
  }

  try {
    // Request routes from OSRM (public instance)
    const response = await axios.get(
      `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}`,
      {
        params: {
          alternatives: 2, // Request up to 2 alternative routes
          steps: true,
          geometries: "polyline",
          overview: "full",
        },
      }
    );

    // Check if routes were found
    if (!response.data.routes || response.data.routes.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No routes found between the given coordinates",
      });
    }

    // Process each route
    const routes = response.data.routes.map((route) => {
      // Decode polyline to get coordinates
      const coordinates = decodePolyline(route.geometry);
      return {
        distance: route.distance / 1000, // Convert meters to kilometers
        duration: route.duration / 60, // Convert seconds to minutes
        path: coordinates.map((coord) => [coord.lat, coord.lng]), // Convert to [lat, lng] for Leaflet
      };
    });

    res.status(200).json({
      status: true,
      data: routes,
    });
  } catch (error) {
    console.error("Routing error:", error.message);
    res.status(500).json({
      status: false,
      message: "Failed to fetch routes",
      error: error.message,
    });
  }
});

// Simple polyline decoding function for OSRM
function decodePolyline(encoded) {
  let points = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}








  


  
server.listen(port, () => {
    console.log(`Your app is listening on port ${port}`)
})



export default io












