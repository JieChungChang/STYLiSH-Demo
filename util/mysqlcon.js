const mysql   = require("mysql");
const db = mysql.createConnection({
	host    : "localhost",
	user    : "root",
	password: "password",
	database: "stylish"
});

db.connect( (err) => {
  if (err) {
	throw err;
  } else{
	console.log("MYSQL Connected!");
  }
}); 

module.exports = db;

