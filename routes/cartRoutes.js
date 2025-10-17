const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Cart = require("../models/cart");
const Item = require("../models/item");
const authMiddleware = require("../middleware/authMiddleware");

async function recalculateTotals(cart) {
  let total = 0;
  for (const cartLine of cart.items) {
    const product = await Item.findById(cartLine.item);
    if (!product) {
      // Skip non-existing items silently; cleanup happens on save
      continue;
    }
    const linePrice = product.price * cartLine.quantity;
    total += linePrice;
  }
  cart.totalPrice = total;
}

router.use(authMiddleware);

// Get current user's cart
router.get("/", async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate({
      path: "items.item",
      select: "name price image",
    });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [], totalPrice: 0 });
    }
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

// Add item to cart
router.post("/add", async (req, res, next) => {
  try {
    const { itemId, quantity } = req.body;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid itemId" });
    }
    const qty = Number(quantity) > 0 ? Number(quantity) : 1;

    const product = await Item.findById(itemId);
    if (!product) {
      return res.status(404).json({ message: "Item not found" });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [], totalPrice: 0 });
    }

    const existing = cart.items.find((line) => String(line.item) === String(itemId));
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.items.push({ item: itemId, quantity: qty });
    }

    await recalculateTotals(cart);
    await cart.save();

    await cart.populate({ path: "items.item", select: "name price image" });
    res.status(201).json(cart);
  } catch (err) {
    next(err);
  }
});

// Update item quantity in cart
router.patch("/item/:itemId", async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid itemId" });
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({ message: "Quantity must be >= 0" });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const line = cart.items.find((l) => String(l.item) === String(itemId));
    if (!line) {
      return res.status(404).json({ message: "Item not in cart" });
    }

    if (qty === 0) {
      cart.items = cart.items.filter((l) => String(l.item) !== String(itemId));
    } else {
      line.quantity = qty;
    }

    await recalculateTotals(cart);
    await cart.save();
    await cart.populate({ path: "items.item", select: "name price image" });
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

// Remove item from cart
router.delete("/item/:itemId", async (req, res, next) => {
  try {
    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid itemId" });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const before = cart.items.length;
    cart.items = cart.items.filter((l) => String(l.item) !== String(itemId));
    if (cart.items.length === before) {
      return res.status(404).json({ message: "Item not in cart" });
    }

    await recalculateTotals(cart);
    await cart.save();
    await cart.populate({ path: "items.item", select: "name price image" });
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

// Clear cart
router.delete("/clear", async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();
    res.json(cart);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
