import mongoose from "mongoose";


const profileSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    userEmail: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    age: {
        type:String,
        required: true
    },
    gender: {
        type:String,
        required: true,
    },
    dateOfBirth: {
        type:String,
        required: true
    },
    state:{
        type:String,
        required:true
    },
    LGA: {
        type:String,
        required: true
    }, 
    address: {
        type:String,
        required: true
    },
    maritalStatus:{
        type:String,
        required: true
    },
    WDYD: {
        type:String,
       
    },
    profilePicture:{
        type:String
    },

  

}, {timestamps: true})


export default mongoose.model("Profile", profileSchema)