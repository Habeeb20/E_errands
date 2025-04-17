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


   // Handle location updates from the errander
   socket.on('updateLocation', ({ userId, errandId, position }) => {
    // Find the errand to get the client ID
    Errand.findById(errandId)
      .then((errand) => {
        if (errand && errand.status === 'in_progress') {
          // Emit to both errander and client
          io.to(userId).emit('erranderLocation', { errandId, position });
          io.to(errand.clientId.toString()).emit('erranderLocation', { errandId, position });
        }
      })
      .catch((error) => {
        console.error('Error broadcasting location:', error);
      });
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


app.get("/", (req, res) => {
    res.send("app is listening on port....")
  })
  
server.listen(port, () => {
    console.log(`Your app is listening on port ${port}`)
})















