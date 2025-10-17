require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./db");
const itemRoutes = require("./routes/itemRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoute");
const authRoutes = require("./routes/authRoutes");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Welcome!");
});
app.use("/users", userRoutes);
app.use("/items", itemRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "This endpoint doesn't exist" });
});

app.use((err, req, res, next) => {
  console.error("Global Error:", err); 

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({ success: false, message });
});

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to initialize server:", err);
    process.exit(1);
  }
})();