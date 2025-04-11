import User from "../models/user.js";
import Profile from "../models/Auth/profile.js";
import express from "express";
import jwt from "jsonwebtoken"
import {verifyToken} from "../middleware/verifyToken.js"
import cloudinary from "cloudinary"

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



profileRoute.get("/getprofile", verifyToken, async (req, res) => {
    try {
     
      const userId = req.user.id || req.user._id; 
      if (!userId) {
        return res.status(400).json({
          status: false,
          message: "User ID not found in token payload",
        });
      }
  
      const user = await User.findOne({ _id: userId }); 
      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User account not found",
        });
      }
  

      const profile = await Profile.findOne({ userId: user._id }).populate("userId", "firstName lastName phone email role");
      if (!profile) {
        return res.status(404).json({
          status: false,
          message: "Profile data not found",
        });
      }
  
      return res.status(200).json({
        status: true,
        message: "Successfully retrieved",
        profile, 
      });
    } catch (error) {
      console.error("Error in getProfile:", error);

      if (error.name === "CastError") {
        return res.status(400).json({
          status: false,
          message: "Invalid user ID format",
        });
      } else if (error.name === "ValidationError") {
        return res.status(400).json({
          status: false,
          message: "Validation error in query",
        });
      } else {
        return res.status(500).json({
          status: false,
          message: "An error occurred on the server",
        });
      }
    }
  });


profileRoute.put("/update", verifyToken, async(req, res) => {
  const  {userId,  phone, address,  WDYD, profilePicture} = req.body

    try {
        const user = await User.findByIdAndUpdate(
            userId,
            {phone,  profilePicture},
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


//upload ur picture
profileRoute.put("/:id", verifyToken, async(req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log("User account not found");
            return res.status(404).json({ message: "User account not found" });
        }

        const profile = await Profile.findOne({ userId: user._id })
        if(!profile){
            return res.status(404).json({
                status: false,
                message: "Profile data not found",
              });
        }

        const profileData = await Profile.findById(id)
        if(!profileData){
            console.log("profile not found")
            return res.status(404).json({message: "data not found"})
        }

        if(profileData.userId.toString() !== req.user.id){
            console.log("Unauthorized: User does not own this profile");
            return res.status(403).json({ message: "Not authorized to update this profile" });
        }

        const updates = {};
        for (const key in req.body) {
            if (req.body[key] !== undefined && req.body[key] !== "") {
                updates[key] = req.body[key];
            }
        }

        
        const uploadFile = async (file) => {
            try {
                const result = await cloudinary.uploader.upload(file.tempFilePath, {
                    folder: "schools",
                });
                return result.secure_url;
            } catch (error) {
                console.error("Cloudinary upload error:", error);
                throw new Error("File upload failed");
            }
        };

        if (req.files) {
            const fileKeys = [
                "profilePicture", 
            ];

            for (let key of fileKeys) {
                if (req.files[key]) {
                    updates[key] = await uploadFile(req.files[key]);
                    console.log(`Uploaded ${key}:`, updates[key]);
                }
            }
        }

        const updatedProfile = await Profile.findByIdAndUpdate(
            id,
            { $set: updates }, 
            { new: true, runValidators: true }
        );

        if (!updatedProfile) {
            console.log("Failed to update store");
            return res.status(500).json({ message: "Failed to update store." });
        }

        console.log("Store updated successfully:", updatedStore);
        res.status(200).json(updatedStore);
    } catch (error) {
        
    }
})




profileRoute.get("/:slug/shares", async(req, res) => {
  try {
    const {slug} = req.params
    const profile = await Profile.findOne({slug});
    if(!profile){
      return res.status(404).json({message: "profile not found"})
    }
    res.status(200).json({shareCount:profile.shares})
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
})


///increment shares
profileRoute.post("/:slug/shares", async(req, res) => {
  try {
    const {slug} = req.params;
    const profile =  await Profile.findOneAndUpdate(
      {slug},
      {$inc: {shares: 1}},
      {new: true}
    )
    if(!profile){
      return res.status(404).json({message: "profile not found"})
    }

    return res.status(200).json({
      message: "shares count updated", shareCount: profile.shares
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
})

///increment click
profileRoute.post("/:slug/click", async(req, res) => {
    try {
      const {slug} = req.params;
      const profile =await Profile.findOneAndUpdate(
        {slug},
        {$inc:{clicks: 1}},
        {new: true}
      )

      if(!profile){
        return res.status(404).json({
          message: "profile not found"
        })
      }

      return res.status(200).json({message: "clicks successfully updated"})

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
} )


//get clicks
profileRoute.get("/get-clicks/:slug", async(req, res) => {
  try {
    const {slug} = req.params

    const profile = await Profile.findOne(slug)
    if(!profile){
      return res.status(404).json({message: "profile not found"})
    }

    res.status(200).json({clicks:profile.clicks})
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
})


//get every clicks
profileRoute.get("/get-clicks", async(req, res) => {
   try {
    const profile = await Profile.find({}, "profile clicks")

    return res.status(200).json(profile)
   } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
   }
})




profileRoute.get("/aprofile/:slug", async(req, res) => {
  try {
    const {slug} = req.params.slug;

    const profile = await Profile.findOne(slug)
        .populate("userId", 'firstName lastName phone email role isBlacklisted verificationStatus uniqueNumber');

    if(!profile){
      console.log("profile not found")
      return res.status(404).json({
        message: "profile not found"
      })
    }

    return res.status(200).json({
      message: "profile is available",
      profile
    })

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
})


profileRoute.post("/:slug/comments", async(req, res) => {
  const {name, text} = req.body;

  if(!name || !text){
    return res.status(400).json({message: "name and text are required"})

  }

  try {
    const profile = await Profile.findOne({slug:req.body.slug})
    if(!profile){
      return res.status(404).json({
        message: "profile is not found",
        success: false
      })
    }

    const  newComment = {name, text, createdAt: new Date()}
    profile.comments.push(newComment)
    await profile.save() 

    res.status(201).json({
      status:true,
      profile,
      message:"succcessfully commented"
    })
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
})
export default profileRoute