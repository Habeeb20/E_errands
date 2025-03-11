import mongoose, { mongo } from "mongoose";
import slugify from "slugify";

const userSchema = new mongoose.Schema({
    firstName:{
        type:String,
        required: true
    },
    lastName:{
        type:String,
        required: true
    },
    phone: {
        type:String,
        required: true
    },
    email: {
        type:String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type:String,
        required: true,
        enum:["errander", "user"]
    },

 
    createdAt: { type: Date, default: Date.now },
    registrationDate: { type: Date, default: Date.now },
    uniqueNumber: { type: String, unique: true },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationTokenExpiresAt: Date,
    slug: { type: String, unique: true },
})

userSchema.pre("save", function(next){
    if(!this.slug){
      this.slug = slugify(this.firstName, { lower: true, strict: true });
    }
    next();
  })
  
export default mongoose.model("User", userSchema)