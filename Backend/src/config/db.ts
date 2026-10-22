import mongoose from 'mongoose';

async function connectDB() {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI as string);
        console.log(`MongoDB Connected: ${conn.connection.host}:${conn.connection.port}`);
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        } else {
            console.error('An unknown error occurred during MongoDB connection.');
        }
        process.exit(1);
    }
}

export default connectDB;
