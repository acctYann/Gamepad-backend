const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Favorite = require("../models/Favorite");
const isAuthenticated = require("../middlewares/isAuthenticated");
const { Mongoose } = require("mongoose");

router.get("/favorites", isAuthenticated, async (req, res) => {
  const user = req.user;
  const responseUser = await user.populate("favoriteGames");

  res.status(200).json({ favorite: responseUser.favoriteGames });
  // console.log("route");
  // console.log({ favorite: responseUser.favoriteGames });
});

router.post("/favorite/create", isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const favorite = new Favorite({
      user: user._id,
      gameData: req.fields.game,
    });
    await favorite.save();
    user.favoriteGames.push(favorite);
    await user.save();
    res.status(200).json({ message: "Favorite has been saved. 🚀" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/favorite/delete", isAuthenticated, async (req, res) => {
  try {
    const user = await req.user.populate("favoriteGames");
    const favorite = await Favorite.findOne({
      "gameData.slug": req.fields.game.slug,
      user: user._id,
    });
    user.favoriteGames = user.favoriteGames.filter(
      (slug) => slug.gameData.slug !== favorite.gameData.slug
    );
    user.markModified("favoriteGames");
    await favorite.delete();
    await user.save();
    res.status(200).json({ message: "Favorite has been saved. 🚀" });
    console.log("delete");
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
