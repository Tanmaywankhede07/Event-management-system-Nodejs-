var mysql = require('mysql');
var conn = mysql.createConnection({
  host: 'localhost',
  user: 'tanmay',
  password: 'Tanmay@123',
  database: 'event_management' 
}); 
 
conn.connect(function(err) {
  if (err) throw err;
  console.log('Database is connected successfully !');
});
module.exports = conn;

