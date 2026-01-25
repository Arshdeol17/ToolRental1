const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

client.connect()
    .then(() => console.log('PostgreSQL connected from db.js'))
    .catch((err) => console.error('Connection error', err.stack));

module.exports = client;
