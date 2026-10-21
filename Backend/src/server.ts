import app from './app.ts';
import connectDB from './config/db.ts';

// Database Connection
void connectDB();

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
