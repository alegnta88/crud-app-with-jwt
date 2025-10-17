const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Item = require("../models/item");
const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");


const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const isValidExt = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const isValidMime = allowedTypes.test(file.mimetype);

  if (isValidExt && isValidMime) {
    cb(null, true);
  } else {
    console.log(`Upload rejected: ${file.originalname} is not an allowed image type.`);
    const error = new Error("Only image files are allowed!");
    error.statusCode = 400;
    cb(error);
  }
};

const upload = multer({ storage, fileFilter });

const deleteImageFile = (imagePath) => {
  if (!imagePath) return;
  const fullPath = path.join(__dirname, "..", imagePath.replace(/^\//, ""));
  fs.unlink(fullPath, (err) => {
    if (err) console.error("Error deleting image file:", err);
    else console.log("✅ Image file deleted:", imagePath);
  });
};

// GET all items
router.get("/", async (req, res, next) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// GET one item by ID
router.get("/:id", async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      const error = new Error("Item not found");
      error.statusCode = 404;
      throw error;
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// POST new item
router.post(
  "/",
  authMiddleware,
  authorizeRoles("admin"),
  upload.single("image"),
  async (req, res, next) => {
    const { name, price, description } = req.body;

    if (!name || !price || !description) {
      const error = new Error("Name, price, and description are required.");
      error.statusCode = 400;
      return next(error);
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    try {
      const item = await Item.create({ name, price, description, image: imagePath });
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  }
);

// PUT update item
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  upload.single("image"),
  async (req, res, next) => {
    const { name, price, description } = req.body;
    const updateData = { name, price, description };

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    try {
      const updatedItem = await Item.findByIdAndUpdate(req.params.id, updateData, { new: true });
      if (!updatedItem) {
        const error = new Error("Item not found");
        error.statusCode = 404;
        throw error;
      }
      res.json(updatedItem);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE item
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("admin"),
  async (req, res, next) => {
    try {
      const deletedItem = await Item.findByIdAndDelete(req.params.id);
      if (!deletedItem) {
        const error = new Error("Item not found");
        error.statusCode = 404;
        throw error;
      }

      deleteImageFile(deletedItem.image);

      res.json({ message: "Item deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;