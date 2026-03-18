const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Build connection options for production replica set support
    const mongoUri = process.env.MONGO_URI;
    const options = {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      // For local MongoDB: ensure replica set is configured
      // Atlas automatically handles this
    };

    const conn = await mongoose.connect(mongoUri, options);
    
    // Verify server supports sessions (required for transactions)
    const serverStatus = await conn.connection.db.admin().serverStatus();
    const hasReplicaSet = serverStatus.repl?.setName || false;
    
    if (!hasReplicaSet) {
      console.warn("⚠️ WARNING: MongoDB is not a replica set - TRANSACTIONS WILL NOT WORK");
      console.warn("For production, ensure MongoDB is configured as a replica set");
      console.warn("For local development with Docker:");
      console.warn("  docker run --name mongodb -d -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=root -e MONGO_INITDB_ROOT_PASSWORD=pass mongodb/mongodb-community-server --replSet rs0");
    }
    
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    if (hasReplicaSet) {
      console.log(`✅ Replica set configured: ${serverStatus.repl?.setName}`);
    }
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
