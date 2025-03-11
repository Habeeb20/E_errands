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
                    <a href="http://localhost:5173/verifyemail?email=${encodeURIComponent(
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
          roleMessage = "Welcome,  You have full access to the system as errander account.";
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


export default userRoute