var mysql = require('mysql');
require("dotenv").config();

var conn = mysql.createConnection({
  host: 'localhost',
  user: 'tanmay',
  password: 'Tanmay@123',
  database: 'event_management',
}); 
 
conn.connect(function(err) {
  if (err) throw err;
  console.log('Database is connected successfully !');
});
    
let db = {}
  
db.allUser = () =>{
    return new Promise((resolve, reject)=>{
        conn.query('SELECT * FROM User ', (error, users)=>{
            if(error){
                return reject(error);
            }
            return resolve(users);
        });
    });
};
 
db.getUserByEmail = (email) =>{
    return new Promise((resolve, reject)=>{
        conn.query('SELECT * FROM users WHERE email = ?', [email], (error, users)=>{
            if(error){
                return reject(error);
            }
            return resolve(users[0]);
             
        });
    });
};
 
db.insertUser = (userName, email, password) =>{
    return new Promise((resolve, reject)=>{
        conn.query('INSERT INTO User (user_name, email, password) VALUES (?,  ?, ?)', [userName, email, password], (error, result)=>{
            if(error){
                return reject(error);
            }
             
              return resolve(result.insertId);
        });
    });
};
 
db.updateUser = (userName, email, password, id) =>{
    return new Promise((resolve, reject)=>{
        conn.query('UPDATE User SET user_name = ?, email= ?, password=? WHERE id = ?', [userName, email, password, id], (error)=>{
            if(error){
                return reject(error);
            }
             
              return resolve();
        });
    });
};
 
db.updateUserPassword = ( password, id) =>{
  return new Promise((resolve, reject)=>{
      conn.query('UPDATE User SET  password=? WHERE id = ?', [ password, id], (error)=>{
          if(error){
              return reject(error);
          }
           
            return resolve();
      });
  });
};
 
db.deleteUser = (id) =>{
    return new Promise((resolve, reject)=>{
        conn.query('DELETE FROM User WHERE id = ?', [id], (error)=>{
            if(error){
                return reject(error);
            }
            return resolve(console.log("User deleted"));
        });
    });
};
 
// ***Requests to the  resetPasswordToken table ***
db.insertResetToken = (email,tokenValue, createdAt, expiredAt, used) =>{
   return new Promise((resolve, reject)=>{
       conn.query('INSERT INTO ResetPasswordToken ( email, Token_value,created_at, expired_at, used) VALUES (?, ?,?, ?, ?)', [email,tokenValue, createdAt, expiredAt, used], (error, result)=>{
           if(error){
               return reject(error);
           }
            
             return resolve(result.insertId);
       });
   });
};

db.expireOldTokens = (email, used) =>{
   return new Promise((resolve, reject)=>{
       conn.query('UPDATE ResetPasswordToken SET used = ?  WHERE email = ?', [ used, email], (error)=>{
           if(error){
               return reject(error);
           }
            
             return resolve();
       });
   });
};

db.findValidToken = (token, email, currentTime) =>{
  return new Promise((resolve, reject)=>{
      conn.query('SELECT * FROM ResetPasswordToken WHERE (email = ? AND Token_value = ? AND expired_at > ?)', [email,token,  currentTime  ], (error, tokens)=>{
          if(error){
              return reject(error);
          }
          return resolve(tokens[0]);
          //return resolve(token);
      });
  });
};
module.exports = db;

