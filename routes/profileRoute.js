import User from "../models/user.js";
import Profile from "../models/Auth/profile.js";
import express from "express";
import jwt from "jsonwebtoken"
import {verifyToken} from "../middleware/verifyToken.js"

const profileRoute = express.Router()

profileRoute.post("/create",  async(req, res) => {
    const {userEmail, address, age, gender, dateOfBirth, state, LGA, maritalStatus,   } = req.body

    try {
        if(!userEmail ||!address || !age || !gender || !dateOfBirth || !state || !LGA || !maritalStatus){
            return res.status(400).json({
                status: false,
                message : "all required fields are meant to be filled"
            })
        }

        const user = await User.findOne({email: userEmail })
        if(!user){
            return res.status(404).json({
                status: false,
                message: "user not found"
            })
        }

        const profileData = new Profile({
            userEmail,
            userId: user._id,
            maritalStatus,
            age,
            dateOfBirth,
            state,
            LGA, 
            address,
            gender
        })

      await profileData.save()
        return res.status(201).json({
            status: true,
            message: "profile created successfully",
            profileData
        })
            
    } catch (error) {
        console.log(error)
        return res.status(500).json({
        status:false,
        message: "an error occurred"
    })
}
})

profileRoute.get("/getprofile", verifyToken, async(req, res) => {
    const id = req.user.id
    try {
        const user = await User.findOne({id})

        if(!user){
            return res.status(404).json({
                status: false,
                message: "user accound not found"
            })
        }


        const myuserId = user._id

        const profile = await Profile.findOne({userId: myuserId})
        if(!profile) {
            return res.status(404).json({
                status: false,
                message: "profile data not found"
            })
        }

        
        return res.status(200).json({
            status: true,
            message: "successfully retrieved",
            profile
        })


    } catch (error) {
        console.log(error)
        return res.status(500).json({
            status: false,
            message: "an error occurred from the server"
        })
    }
})


profileRoute.put("/update", async(req, res) => {
  const  {userId, email, phone, address,  WDYD, profilePicture} = req.body

    try {
        const user = await User.findByIdAndUpdate(
            userId,
            {phone, email, profilePicture},
            {new: true}
        )

        const profile = await Profile.findOneAndUpdate(
            {userId},
            {address, WDYD},
            {new: true}
        ).populate("userId", "firstName lastName email")
        return res.status(200).json({
            status: true,
            date: profile
        })
    } catch (error) {
        res.status(500).json({status: false, message: "an error occurred in the server"})
    }
})


// router.put(
//     "/update",
//     authMiddleware, // Ensure authenticated user
//     upload.single("profilePicture"), // 'profilePicture' matches the form field name
//     async (req, res) => {
//       const { userId, email, phone, address, WDYD } = req.body;
//       const profilePicture = req.file ? `/uploads/${req.file.filename}` : undefined; // Path if file uploaded
  
//       try {
//         // Authorization check
//         const currentUser = req.user; // From authMiddleware (decoded token)
//         if (!currentUser || currentUser.id !== userId) {
//           return res.status(403).json({ status: false, message: "Unauthorized" });
//         }
  
//         // Validate input
//         if (!email || !phone || !address || !WDYD) {
//           return res.status(400).json({ status: false, message: "All fields are required" });
//         }
  
//         // Update User
//         const user = await User.findByIdAndUpdate(
//           userId,
//           { email, phone, profilePicture }, // Only update profilePicture if provided
//           { new: true, runValidators: true }
//         );
//         if (!user) {
//           return res.status(404).json({ status: false, message: "User not found" });
//         }
  
//         // Update Profile
//         const profile = await Profile.findOneAndUpdate(
//           { userId },
//           { address, WDYD },
//           { new: true, runValidators: true }
//         ).populate("userId", "firstName lastName email");
//         if (!profile) {
//           return res.status(404).json({ status: false, message: "Profile not found" });
//         }
  
//         return res.status(200).json({
//           status: true,
//           data: profile,
//         });
//       } catch (error) {
//         console.error("Update error:", error);
//         if (req.file) {
//           // Clean up uploaded file on error
//           const fs = require("fs");
//           fs.unlink(path.join(__dirname, "../uploads", req.file.filename), (err) => {
//             if (err) console.error("File cleanup error:", err);
//           });
//         }
//         res.status(500).json({ status: false, message: "An error occurred on the server" });
//       }
//     }
// )

export default profileRoute