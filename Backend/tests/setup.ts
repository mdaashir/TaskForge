process.env.NODE_ENV = 'test';
process.env.MONGO_URI =
    process.env.MONGO_URI_TEST ?? 'mongodb://127.0.0.1:27017/taskforge_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-access-secret';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ?? 'test-refresh-secret';
process.env.PREFIX = process.env.PREFIX ?? '/api';
