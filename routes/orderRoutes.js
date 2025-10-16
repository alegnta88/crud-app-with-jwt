const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../models/order");
const Cart = require("../models/cart");
const Item = require("../models/item");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");

router.use(authMiddleware);

// Create order from current cart
router.post("/", async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Build order lines with current prices
    const orderItems = [];
    let total = 0;
    for (const line of cart.items) {
      const product = await Item.findById(line.item);
      if (!product) continue;
      const price = product.price;
      const quantity = line.quantity;
      total += price * quantity;
      orderItems.push({ item: product._id, quantity, price });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ message: "No valid items to order" });
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      totalAmount: total,
      status: "pending",
    });

    // Clear cart
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save();

    const populated = await Order.findById(order._id)
      .populate("user", "name email")
      .populate("items.item", "name image");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

// Get current user's orders
router.get("/my", async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("items.item", "name image");
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Admin: list all orders
router.get("/", authorizeRoles("admin"), async (req, res, next) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("user", "name email")
      .populate("items.item", "name image");
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// Admin: update order status
router.patch("/:orderId/status", authorizeRoles("admin"), async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const allowed = ["pending", "paid", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const updated = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    )
      .populate("user", "name email")
      .populate("items.item", "name image");
    if (!updated) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
