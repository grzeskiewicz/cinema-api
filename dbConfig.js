module.exports = {
    config: {
        host: 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        port: 3306
    }
}