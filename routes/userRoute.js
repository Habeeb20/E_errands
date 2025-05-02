import User from "../models/user.js";
import jwt from "jsonwebtoken"
import express from "express";
import bcrypt from "bcrypt"
import nodemailer from "nodemailer"
import crypto from "crypto"
import dotenv from "dotenv"
import upload from "../upload.js";
import cloudinary from "cloudinary"
import Profile from "../models/Auth/profile.js";
import multer from "multer";
import bcryptjs from "bcrypt"
import { verifyToken } from "../middleware/verifyToken.js";
import Errand from "../models/errand/errandSchema.js";


const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
};




dotenv.config()


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET,
})

const transporter = nodemailer.createTransport(({
    service:'gmail',
    auth: {
        user:"essentialng23@gmail.com",
        pass:"edrsybyduvthwsbd"
      },
}));

const sendOTPEmail = async (email, otp, firstName) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify your email",
      html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification - E_Errands</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f5f5; color: #333;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="padding: 20px; text-align: center; background-color: #7E2E; color: white; border-top-left-radius: 12px; border-top-right-radius: 12px;">
                  <h1 style="font-size: 28px; margin: 0; font-weight: bold; font-family: 'Helvetica', sans-serif;">E_Errands</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="font-size: 24px; color: #333; margin-bottom: 20px; font-weight: 600; font-family: 'Helvetica', sans-serif;">Verify Your Email</h2>
                  <p style="font-size: 16px; line-height: 1.6; color: #666; margin-bottom: 20px;">
                    Hello ${firstName || "there"},
                  </p>
                  <p style="font-size: 16px; line-height: 1.6; color: #666; margin-bottom: 30px;">
                    Thank you for signing up with E_errand! To complete your registration and secure your account, please verify your email address by entering the following 6-digit verification code:
                  </p>
                  <div style="text-align: center; margin: 30px 0; background-color: #f0f0f0; padding: 20px; border-radius: 8px;">
                    <span style="display: inline-block; font-size: 32px; font-weight: bold; color: #7E2E; letter-spacing: 6px; font-family: 'Helvetica', sans-serif;">
                      ${otp}
                    </span>
                  </div>
                  <p style="font-size: 16px; line-height: 1.6; color: #666; margin-bottom: 20px;">
                    This code will expire in 24 hours for your security. If you didn’t request this verification, please ignore this email or contact our support team at <a href="mailto:support@e-ride.com" style="color: #7E22CE; text-decoration: none; font-weight: 500;">support@e-ride.com</a>.
                  </p>
                  <p style="font-size: 16px; line-height: 1.6; color: #666; margin-bottom: 30px;">
                    If you have any questions, feel free to reach out to us. We’re here to help you get started with E_Ride!
                  </p>
                  <div style="text-align: center; margin-top: 30px;">
                    <a href=http://localhost:5173/verifyemail?email=${encodeURIComponent(
                      email
                    )}" 
                       style="display: inline-block; padding: 12px 30px; background-color: #7E2E; color: white; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; font-family: 'Helvetica', sans-serif; transition: background-color 0.3s;">
                      Verify Now
                    </a>
                  </div>
                  <p style="font-size: 14px; color: #999; text-align: center; margin-top: 40px; font-family: 'Arial', sans-serif;">
                    © 2025 E_errand. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
    };
    try {
      const sentMail = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", sentMail);
      return { success: true };
    } catch (error) {
      console.error("Email sending error:", error);
      return { success: false, error: error.message };
    }
  };


const userRoute = express.Router()



userRoute.post("/register", async(req, res) => {
    const {firstName, lastName, email, phone, password, role}  = req.body

    try {
        if(!firstName || !lastName || !email || !phone || !password || !role ){
            console.log('error')
            return res.status(400).json({
                message: "all required fields must be filled",
                status: false
            })
        }

        const existingUser = await User.findOne({email})
        if(existingUser){

            console.log('user exist')
            return res.status(400).json({ message: 'User already exists' });
        }

        if(phone.length > 11){
            return res.status(400).json({message: "phone number should not exceed 11 characters"})
          }
          if(phone.length < 11){
            return res.status(400).json({message: "phone number shouldnt be less than 11 characters"})
          }
          
               
    const hashedPassword = await bcryptjs.hash(password, 10);
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString(); // OTP generation
    const uniqueNumber = `RL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours


    const user = new User({
        firstName, lastName, email, phone, password: hashedPassword,
    
        uniqueNumber,
        role,
        verificationToken,
        verificationTokenExpiresAt,
    })

    await user.save()

    
    await sendOTPEmail(user.email, verificationToken);
    res.status(201).json({
        message: 'User registered successfully. Please check your email to verify your account',
        user: { ...user._doc, password: undefined },
      });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Something went wrong during registration' });
    }
})

userRoute.post("/login", async(req, res) => {
    const { email, password } = req.body;

    try {
 
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: "Invalid email" });
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Incorrect password" });
  
      const payload = { id: user._id, role: user.role }; 
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
  
      console.log(token);
  
    
      let roleMessage = "";
      switch (user.role) {
        case "errander":
          roleMessage = "Welcome,  You have full access to the system for your errander account.";
          break;

        case "admin":
          roleMessage = "welcome, you have full access to all th activities";
          break;

          case "messenger":
            roleMessage = "welcome, you have full access to your messenger account";
            break;
      
        case "user":
        default:
          roleMessage = "Welcome, User! Enjoy our services.";
          break;
      }
  
      return res.status(200).json({
        status: true,
        role:user.role,
        message: `Successfully logged in. ${roleMessage}`,
        token,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ msg: "Server error" });
    }
})

userRoute.post("/send-otp", async(req, res) => {
try {
    const {email} = req.body;
    console.log("resending the otp:", email)
    const user = await User.findOne({email})
    if(!user){
        return res.status(404).json({status:false, message:"User not found" })
    }
    const verificationToken = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
  
      user.verificationToken = verificationToken;
      user.verificationTokenExpiresAt = verificationTokenExpiresAt;
      await user.save();
      
      
    const response = await sendOTPEmail(
        email,
        verificationToken,
        user.firstName
      );

      if (!response.success) {
        console.log("Email sending error:", response.error);
        return res
          .status(400)
          .json({ status: false, message: "Failed to resend verification code" });
      }
      res.json({
        status: true,
        message: "Verification code resent successfully",
      });
} catch (error) {
    console.error("Send OTP error:", err);
    res.status(500).json({ status: false, message: "Server error occurred" });
}
})

userRoute.post("/verify-email", async(req, res) => {
    try {
        const {email, code} = req.body;
        console.log("verifying email...", {email, code})

        const user = await User.findOne({
            email,
            verificationToken: code,
            verificationTokenExpiresAt: { $gt: Date.now() },
        })
        if (!user) {
            return res
              .status(404)
              .json({
                status: false,
                message: "User not found or invalid verification code",
              });
          }

          
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    const payload = { user: { id: user._id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({
      success: true,
      message: "Email verified successfully",
      token,
      user: { id: user._id, email: user.email, isVerified: true },
    });
    } catch (error) {
        console.error("Email verification error:", err);
        res
          .status(500)
          .json({ status: false, message: err.message || "Server error occurred" });
      
    }
})

userRoute.get("/adminDashboard", verifyToken, isAdmin, async(req, res) => {
  const userId = req.user?.id || req.user?._id; 

  if (!userId) {
    console.log("No user ID provided in request");
    return res.status(401).json({
      status: false,
      message: "Unauthorized: No user ID provided",
    });
  }

  try {
  
    const user = await User.findOne({ _id: userId });
    if (!user) {
      console.log("User not found for ID:", userId);
      return res.status(404).json({
        status: false,
        message: "Not authorized: User not found",
      });
    }
  
    return res.status(200).json({
      status: true,
      data: user,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred",
      error: error.message, 
    });
  }
})



userRoute.get("/erranderdashboard", verifyToken, async(req, res) => {

  try {
    const user = await User.findById(req.user.id)
    if(!user) {
      console.log("user not found")
      return res.status(404).json({
        message: "user not found",
        status: false

      })
    }

    const profile = await Profile.findOne({userId:user._id}).populate("userId", "firstName lastName phone email role");
    if(!profile){
      console.log("profile not found")
      return res.status(404).json({
        message: "profile not found",
        status: false
    })
  }

  return res.status(200).json({
    message:"profile available",
    status: true,
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



userRoute.put('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const updatedProfile = req.body;

    const profile = await Profile.findOneAndUpdate(
      { userId },
      updatedProfile,
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json({ profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Verify an errander
userRoute.put("/verify-errander/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    // Find the user by ID
    const user = await User.findById(req.params.id);
    if (!user) {
      console.log("user not found")
      return res.status(404).json({
        status: false,
        message: "User not found",
        data: null,
      });
    }

    // Check if the user is an errander
    if (user.role !== "errander" || user.role !== "messenger") {
      return res.status(400).json({
        status: false,
        message: "User is not an errander",
        data: null,
      });
    }

    // Check if already verified
    if (user.verificationStatus === "verified") {
      return res.status(400).json({
        status: false,
        message: "Errander is already verified",
        data: null,
      });
    }

    // Update verification status on the User model
    user.verificationStatus = "verified";
    await user.save();

    // Find the corresponding Profile document
    const profile = await Profile.findOne({ userId: req.params.id }).populate('userId');
    if (!profile) {
      return res.status(404).json({
        status: false,
        message: "Profile not found for this user",
        data: null,
      });
    }

    res.status(200).json({
      status: true,
      message: "Errander verified successfully",
      data: profile, // Includes populated userId with updated verificationStatus
    });
  } catch (error) {
    console.error("Error verifying errander:", error.stack);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: process.env.NODE_ENV === "production" ? null : error.message,
    });
  }
});







// userRoute.get("/erranders", async (req, res) => {
//   try {
  
//     const profiles = await Profile.find()
//       .populate({
//         path: "userId",
//         match: { role: { $in: ["errander", "messenger"] }, isBlacklisted: { $ne: true } }, // Exclude blacklisted users
//         select: "firstName lastName phone email role verificationStatus uniqueNumber",
//       })
//       .select("slug profilePicture age gender LGA state comments") // Select only needed fields
//       .lean();

//     // Filter out profiles where userId didn't match the role or was blacklisted (i.e., userId is null after populate)
//     const filteredProfiles = profiles.filter((profile) => profile.userId);

//     // Add commentCount to each profile
//     const profilesWithCommentCount = filteredProfiles.map((profile) => ({
//       ...profile,
//       commentCount: profile.comments ? profile.comments.length : 0,
//     }));

//     res.status(200).json({
//       status: true,
//       message: profilesWithCommentCount.length > 0 ? "Erranders retrieved successfully" : "No erranders found",
//       data: profilesWithCommentCount,
//     });
//   } catch (error) {
//     console.error("Error fetching erranders:", error.stack);
//     res.status(500).json({
//       status: false,
//       message: process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
//     });
//   }
// });



userRoute.get("/erranders", async (req, res) => {
  try {
    // Fetch profiles with populated userId, filtering for errander/messenger roles and non-blacklisted users
    const profiles = await Profile.find()
      .populate({
        path: "userId",
        match: { role: { $in: ["errander", "messenger"] }, isBlacklisted: { $ne: true } },
        select: "firstName lastName phone email role verificationStatus uniqueNumber",
      })
      .select("slug profilePicture age gender LGA state comments")
      .lean();

    // Filter out profiles where userId didn't match the role or was blacklisted
    const filteredProfiles = profiles.filter((profile) => profile.userId);

    // Fetch errand statistics for each profile
    const profilesWithStats = await Promise.all(
      filteredProfiles.map(async (profile) => {
        const userId = profile.userId?._id;

        // Query errands for this errander
        const errands = await Errand.find({ erranderId: userId })
          .select("status calculatedPrice")
          .lean();

        // Calculate statistics
        const completedErrandsCount = errands.filter(
          (errand) => errand.status === "completed"
        ).length;
        const canceledErrandsCount = errands.filter(
          (errand) => errand.status === "cancelled"
        ).length;
        const totalIncome = errands
          .filter((errand) => errand.status === "completed")
          .reduce((sum, errand) => sum + (errand.calculatedPrice || 0), 0);
        const platformFee = totalIncome * 0.1; // 10% of total income
        const incomeAfterFee = totalIncome - platformFee; // Income after deducting 10%

        return {
          ...profile,
          commentCount: profile.comments ? profile.comments.length : 0,
          completedErrandsCount,
          canceledErrandsCount,
          totalIncome,
          platformFee,
          incomeAfterFee,
        };
      })
    );

    res.status(200).json({
      status: true,
      message: profilesWithStats.length > 0 ? "Erranders retrieved successfully" : "No erranders found",
      data: profilesWithStats,
    });
  } catch (error) {
    console.error("Error fetching erranders:", error.stack);
    res.status(500).json({
      status: false,
      message: process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
    });
  }
});



//users
userRoute.get("/allusers", async(req, res) => {
  try {
    const profile = await User.find({role: "user"})
 
    return res.status(200).json(profile)

  } catch (error) {
    console.log(error)
    res.status(500).json({
      message:"profile not found",
      status:(false)
    })
  }
})



userRoute.get('/allmessengers', async (req, res) => {

  const { state } = req.query;
  const query = state ? { state: { $regex: new RegExp(state, 'i') } } : {};

  try {
    const profiles = await Profile.find()
      .populate({
        path: 'userId',
        match: { role: 'messenger', isBlacklisted: { $ne: true } },
        select: 'firstName lastName phone email role verificationStatus uniqueNumber',
      })
      .select('_id slug profilePicture age gender lga state comments')
      .lean();

    const formattedProfiles = profiles
      .filter((profile) => profile.userId)
      .map((profile) => ({
        _id: profile._id,
        name: `${profile.userId.firstName} ${profile.userId.lastName}`.trim(),
        role: `${profile.userId.role}`,
        state: profile.state || 'N/A',
        lga: profile.LGA || 'N/A',
        email: profile.userId.email || 'N/A',
        phone: profile.userId.phone || 'N/A',
        profilePicture: profile.profilePicture || null,
        age: profile.age || null,
        gender: profile.gender || null,
        slug: profile.slug || null,
        verificationStatus: profile.userId.verificationStatus || null,
        uniqueNumber: profile.userId.uniqueNumber || null,
        comments: profile.comments || [],
      }));

    return res.status(200).json(formattedProfiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({
      message: 'Failed to fetch profiles',
      status: false,
    });
  }
});





userRoute.get("/allerranders", async(req, res) => {
  try {
    const profile = await User.find({role: "errander"})
 
    return res.status(200).json(profile)

  } catch (error) {
    console.log(error)
    res.status(500).json({
      message:"profile not found",
      status:(false)
    })
  }
})



userRoute.get('/allmessengersInState', async (req, res) => {
  try {
    const { state } = req.query;
    const query = { role: "messenger" };
    if (state) {
      query.state =  { $regex: new RegExp(state, 'i') };;
    }
    const profiles = await Profile.find(query).populate('userId', 'firstName lastName  email role');
    return res.status(200).json(profiles);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch profiles",
      status: false,
    });
  }
});



userRoute.put("/blacklist-errander/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    // Find the user by ID
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
        data: null,
      });
    }

    // Check if the user is an errander
    if (user.role !== "errander") {
      return res.status(400).json({
        status: false,
        message: "User is not an errander",
        data: null,
      });
    }

    // Find the corresponding Profile document
    const profile = await Profile.findOne({ userId: req.params.id });
    if (!profile) {
      return res.status(404).json({
        status: false,
        message: "Profile not found for this user",
        data: null,
      });
    }

    // Check if already blacklisted
    if (profile.isBlacklisted) {
      return res.status(400).json({
        status: false,
        message: "Errander is already blacklisted",
        data: null,
      });
    }

    // Update blacklist status
    profile.isBlacklisted = true;
    await profile.save();

    // Populate userId for the response
    const updatedProfile = await Profile.findOne({ userId: req.params.id }).populate('userId');

    res.status(200).json({
      status: true,
      message: "Errander blacklisted successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error blacklisting errander:", error.stack);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: process.env.NODE_ENV === "production" ? null : error.message,
    });
  }
});

// Unblacklist an errander
userRoute.put("/unblacklist-errander/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
        data: null,
      });
    }

    if (user.role !== "errander") {
      return res.status(400).json({
        status: false,
        message: "User is not an errander",
        data: null,
      });
    }

    const profile = await Profile.findOne({ userId: req.params.id });
    if (!profile) {
      return res.status(404).json({
        status: false,
        message: "Profile not found for this user",
        data: null,
      });
    }

    if (!profile.isBlacklisted) {
      return res.status(400).json({
        status: false,
        message: "Errander is not blacklisted",
        data: null,
      });
    }

    profile.isBlacklisted = false;
    await profile.save();

    const updatedProfile = await Profile.findOne({ userId: req.params.id }).populate('userId');

    res.status(200).json({
      status: true,
      message: "Errander unblacklisted successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error unblacklisting errander:", error.stack);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: process.env.NODE_ENV === "production" ? null : error.message,
    });
  }
});

// Feature an errander
userRoute.put("/feature-errander/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
        data: null,
      });
    }

    if (user.role !== "errander" || user.role !== "messenger") {
      return res.status(400).json({
        status: false,
        message: "User is neither an errander not a messenger",
        data: null,
      });
    }

    const profile = await Profile.findOne({ userId: req.params.id });
    if (!profile) {
      return res.status(404).json({
        status: false,
        message: "Profile not found for this user",
        data: null,
      });
    }

    if (profile.isFeatured) {
      return res.status(400).json({
        status: false,
        message: "Errander is already featured",
        data: null,
      });
    }

    profile.isFeatured = true;
    await profile.save();

    const updatedProfile = await Profile.findOne({ userId: req.params.id }).populate('userId');

    res.status(200).json({
      status: true,
      message: "Errander featured successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error featuring errander:", error.stack);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: process.env.NODE_ENV === "production" ? null : error.message,
    });
  }
});


userRoute.get('/messengers/stats', async (req, res) => {
  try {
    const stats = await Profile.aggregate([
      // Join with User collection
      {
        $lookup: {
          from: 'users', // The name of the User collection (lowercase, pluralized by Mongoose)
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
        },
      },
      // Unwind the userId array (since $lookup returns an array)
      { $unwind: '$userId' },
      // Match only messengers who are not blacklisted
      {
        $match: {
          'userId.role': 'messenger',
          'userId.isBlacklisted': { $ne: true },
        },
      },
      // Group by state and count
      {
        $group: {
          _id: '$state',
          count: { $sum: 1 },
        },
      },
      // Project to rename _id to name
      {
        $project: {
          name: '$_id',
          count: 1,
          _id: 0,
        },
      },
      // Sort alphabetically by state name
      { $sort: { name: 1 } },
    ]);

    // If no data, return a default response or handle as needed
    if (!stats || stats.length === 0) {
      return res.status(200).json([
        { name: 'Lagos', count: 237 },
        { name: 'Kaduna', count: 237 },
        { name: 'Jos', count: 237 },
        { name: 'Cross-River', count: 237 },
        { name: 'Oyo', count: 237 },
        { name: 'Ogun', count: 237 },
        { name: 'Abia', count: 237 },
        { name: 'Anambra', count: 237 },
        { name: 'Ondo', count: 237 },
        { name: 'Abuja', count: 237 },
        { name: 'Zaria', count: 237 },
        { name: 'Benue', count: 237 },
        { name: 'Imo', count: 237 },
        { name: 'Niger', count: 237 },
        { name: 'Nasarawa', count: 237 },
      ]);
    }

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching messenger stats:', error);
    res.status(500).json({
      message: 'Failed to fetch messenger stats',
      status: false,
    });
  }
});

// Unfeature an errander
userRoute.put("/unfeature-errander/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
        data: null,
      });
    }

    if (user.role !== "errander") {
      return res.status(400).json({
        status: false,
        message: "User is not an errander",
        data: null,
      });
    }

    const profile = await Profile.findOne({ userId: req.params.id });
    if (!profile) {
      return res.status(404).json({
        status: false,
        message: "Profile not found for this user",
        data: null,
      });
    }

    if (!profile.isFeatured) {
      return res.status(400).json({
        status: false,
        message: "Errander is not featured",
        data: null,
      });
    }

    profile.isFeatured = false;
    await profile.save();

    const updatedProfile = await Profile.findOne({ userId: req.params.id }).populate('userId');

    res.status(200).json({
      status: true,
      message: "Errander unfeatured successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error unfeaturing errander:", error.stack);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: process.env.NODE_ENV === "production" ? null : error.message,
    });
  }
});

// Get featured erranders
userRoute.get("/featured-erranders", async (req, res) => {
  try {
    const featuredErranders = await Profile.find({
      isFeatured: true,
      isBlacklisted: false,
    })
      .populate({
        path: 'userId',
        match: {
          role: "errander",
          verificationStatus: "verified",
        },
      })
      .lean();

    // Filter out profiles where userId didn't match the population criteria
    const validErranders = featuredErranders.filter((profile) => profile.userId !== null);

    res.status(200).json({
      status: true,
      message: "Featured erranders retrieved successfully",
      data: validErranders,
    });
  } catch (error) {
    console.error("Error fetching featured erranders:", error.stack);
    res.status(500).json({
      status: false,
      message: "Server error",
      error: process.env.NODE_ENV === "production" ? null : error.message,
    });
  }
});


export default userRoute