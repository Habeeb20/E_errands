import mongoose from "mongoose";
import slugify from "slugify";

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, 
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ["errander", "user", "admin", "messenger"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  uniqueNumber: {
    type: String,
    unique: true,
  },
  resetPasswordToken: String,
  resetPasswordExpiresAt: Date,
  verificationToken: String,
  verificationTokenExpiresAt: Date,
  slug: {
    type: String,
    unique: true,
  },



  verificationStatus: {
    type: String,
    enum: ["unverified", "verified"],
    default: function () {
      return this.role === "errander" || this.role === "messenger" ? "unverified" : "verified";
    },
  },
  isBlacklisted: {
    type: Boolean,
    default: false, 
  },
  isFeatured: {
    type: Boolean,
    default: false, 
  },
}, );


userSchema.pre("save", function (next) {
  if (!this.slug) {
    this.slug = slugify(this.email, { lower: true, strict: true });
  }
  next();
});

userSchema.methods.verifyErrander = function () {
  if (this.role !== "errander" || this.role !== "messenger") {
    throw new Error("Only erranders  or messengers can be verified");
  }
  this.verificationStatus = "verified";
  return this.save();
};

userSchema.methods.blacklistErrander = function () {
  if (this.role !== "errander" || this.role !== "messenger") {
    throw new Error("Only erranders or messengers can be blacklisted");
  }
  this.isBlacklisted = true;
  return this.save();
};


userSchema.methods.unblacklistErrander = function () {
  if (this.role !== "errander" || this.role !== "messenger") {
    throw new Error("Only erranders or messengers can be unblacklisted");
  }
  this.isBlacklisted = false;
  return this.save();
};


userSchema.methods.featureErrander = function () {
  if (this.role !== "errander" || this.role !== "messenger") {
    throw new Error("Only erranders or messengers can be blacklisted");
  }
  this.isFeatured = true;
  return this.save();
};

userSchema.methods.unfeatureErrander = function () {
  if (this.role !== "errander") {
    throw new Error("Only erranders can be unfeatured");
  }
  this.isFeatured = false;
  return this.save();
};


export default mongoose.model("User", userSchema);