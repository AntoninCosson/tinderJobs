

const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
  username: String,
  passwordHash: String,
  email: { type: String, index: true },
  // token: String,
  author: String,
},
{ timestamps: true }
);

const User = mongoose.model("Users", UserSchema);

module.exports = User;