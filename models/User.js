const mongoose = require("mongoose");

const User = mongoose.model("User", {
  email: {
    unique: true,
    type: String,
  },
  username: {
    required: true,
    type: String,
  },
  favoriteGames: [{ ref: "Favorite", type: mongoose.Schema.Types.ObjectId }],
  reviews: [{ ref: "Review", type: mongoose.Schema.Types.ObjectId }],
  token: String,
  hash: String,
  salt: String,
  updatePasswordToken: { type: String, default: null },
  updatePasswordExpiredAt: { type: Number, default: null },
  avatar: Object,
});

module.exports = User;
