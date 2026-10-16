const mongoose = require('mongoose');

let mongoServer = null;

async function connectDB() {
  const customUri = process.env.MONGODB_URI;

  // 1. If explicit URI is provided, attempt connection
  if (customUri && customUri.trim() !== '') {
    try {
      console.log(`Connecting to MongoDB at: ${customUri}...`);
      await mongoose.connect(customUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('MongoDB connected successfully (Custom/Atlas/Local URI).');
      return;
    } catch (err) {
      console.warn(`Could not connect to provided MONGODB_URI (${err.message}).`);
      console.log('Falling back to local development database...');
    }
  }

  // 2. Try default local MongoDB (127.0.0.1:27017/mediguard)
  try {
    const localUri = 'mongodb://127.0.0.1:27017/mediguard';
    await mongoose.connect(localUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log('MongoDB connected successfully (Local mongod service: mongodb://127.0.0.1:27017/mediguard).');
    return;
  } catch (localErr) {
    // 3. Fallback to in-memory MongoDB server for effortless zero-config setup
    console.log('Local MongoDB service is not active. Initializing built-in in-memory MongoDB...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const inMemoryUri = mongoServer.getUri();
      await mongoose.connect(inMemoryUri);
      console.log('Connected to In-Memory MongoDB successfully!');
      console.log(`Database URI: ${inMemoryUri}`);
      console.log('(Note: To connect to MongoDB Atlas or local MongoDB, set MONGODB_URI in .env)');
    } catch (memErr) {
      console.error('Fatal: Failed to connect to MongoDB:', memErr.message);
      process.exit(1);
    }
  }
}

async function closeDB() {
  try {
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (err) {
    console.error('Error closing database connection:', err);
  }
}

module.exports = {
  connectDB,
  closeDB,
};
