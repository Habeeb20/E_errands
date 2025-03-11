import mongoose from "mongoose";
import dotenv from "dotenv"

const connectDb = async (req, res) => {
    try {
        const connect = await mongoose.connect(process.env.MONGO_URL)
        if(!connect) {
            console.log("not connected")
            return res.status(400).json({
                message: "not connc=ected"
            })
        }

        console.log("well connected to the database")
    } catch (error) {
        console.log(error)
    }
}

export default connectDb