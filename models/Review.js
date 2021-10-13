const mongoose = require("mongoose");

const Review = mongoose.model("Review", {
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  title: String,
  text: String,
  thumbUp: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  thumdown: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  gameData: Object,
});

module.exports = Review;
