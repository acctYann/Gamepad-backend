const mongoose = require("mongoose");

const Favorite = mongoose.model("Favorite", {
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  gameData: Object,
});

module.exports = Favorite;
