import mongoose from "mongoose";
import slugify from "slugify";

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
    phoneNumber:{
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
    driverLicense:{
        type:String
    },
    NIN:{
        type:String,
    },
    medicalCondition:{
        type:String,
    },
    alcoholUse:{
        type:String,
    },
    height:{
        type:String,
    },
    weight:{
        type:String,

    },
    referenceAddress: {},
referenceContact: {type:String},
referenceOccupation: {type:String},
numberOfWives: {type:String},
addressOfSpouse: {type:String},
numberOfChildren: {type:String},
slug: { type: String, unique: true },
comments: [
    {
      name: String,
      text: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  clicks: { type: Number, default: 0 }, 
  shares: { type: Number, default: 0 },

  

}, {timestamps: true})
profileSchema.pre("save", function(next){
    if(!this.slug){
        this.slug=slugify(this.userEmail, { lower: true, strict: true })
    }
    next()
})

export default mongoose.model("Profile", profileSchema)