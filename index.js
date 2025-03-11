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
dotenv.config();
connectDb();

const app = express();

app.set("timeout", 60000);

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


app.get("/", (req, res) => {
    res.send("app is listening on port....")
  })
  
app.listen(port, () => {
    console.log(`Your app is listening on port ${port}`)
})