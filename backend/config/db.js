const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'civicsense',
  process.env.MYSQL_USER || 'root',
  process.env.MYSQL_PASSWORD || '1234', // <-- set your password here
  {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    logging: false,
  }
);

module.exports = sequelize;