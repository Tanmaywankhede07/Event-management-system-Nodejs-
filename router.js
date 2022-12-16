const express = require('express');
const router = express.Router();
const db  = require('./dbConnection');
const { signupValidation } = require('./validation');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { hashSync, genSaltSync } = require("bcrypt");
const jwt = require('jsonwebtoken');
require("dotenv").config();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
 
//Register User
router.post('/register', signupValidation, (req, res, next) => {
  db.query(
    `SELECT * FROM users WHERE LOWER(email) = LOWER(${db.escape(
      req.body.email
    )});`,
    (err, result) => {
      if (result.length) {
        return res.status(409).send({
          msg: 'Email already registered'
        });
      } else {
        // username is available
        bcrypt.hash(req.body.password, 10, (err, hash) => {
          if (err) {
            return res.status(500).send({
              msg: err
            });
          } else {
            // has hashed pw => add to database
            db.query(
              `INSERT INTO users (name, email, password) VALUES ('${req.body.name}', ${db.escape(
                req.body.email
              )}, ${db.escape(hash)})`,
              (err, result) => {
                if (err) {
                  throw err;
                  return res.status(400).send({
                    msg: err
                  });
                }
                return res.status(201).send({
                  msg: 'The user has been registerd!'
                });
              }
            );
          }
        });
      }
    }
  );
});

//Login User
router.post('/login', (req, res, next) => {
    db.query(
      `SELECT * FROM users WHERE email = ${db.escape(req.body.email)};`,
      (err, result) => {
        // user does not exists
        if (err) {
          throw err;
          return res.status(400).send({
            msg: err
          });
        }
  
        if (!result.length) {
          return res.status(401).send({
            msg: 'Email or password is incorrect!'
          });
        }
  
        // check password
        bcrypt.compare(
          req.body.password,
          result[0]['password'],
          (bErr, bResult) => {
            // wrong password
            if (bErr) {
              throw bErr;
              return res.status(401).send({
                msg: 'Email or password is incorrect!'
              });
            }
  
            if (bResult) {
              const token = jwt.sign({
                  email: result[0].email,
                  userId: result[0].id
                },
                'SECRETKEY', {
                  expiresIn: '7d'
                }
              );
  
              db.query(
                `UPDATE users SET lastLogin = now() WHERE id = ${result[0].id}`
              );
              return res.status(200).send({
                msg: 'Logged in!',
                token,
                user: result[0]
              });
            }
            return res.status(401).send({
              msg: 'Email or password is incorrect!'
            });
          }
        );
      }
    );
});

//Logout User
router.get('/logout', async (req, res) => {
    if (req.body.email) {
        delete req.body.email;
        res.json({result: 'SUCCESS'});
    } else {
        res.json({result: 'ERROR', message: 'User is not logged in.'});
    }
});

router.post('/forgotPassword', async(req, res, next)=>{
  try{
  const email = req.body.email;
   
  const origin = req.header('Origin'); // we are  getting the request origin from  the origin header.
   
  const user = await db.getUserByEmail(email);
  
   
  if(!user){
     return res.json({status: 'ok'});
  }
  await db.expireOldTokens(email, 1);

  // create reset token that expires after 1 hours

 const resetToken = crypto.randomBytes(40).toString('hex');
 const resetTokenExpires = new Date(Date.now() + 60*60*1000);
 const createdAt = new Date(Date.now());
const expiredAt = resetTokenExpires;
  
  
 //insert the new token into resetPasswordToken table
 await db.insertResetToken(email, resetToken,createdAt, expiredAt, 0);

 // send email
 await sendPasswordResetEmail(email,resetToken, origin);
 res.json({ message: 'Please check your email for a new password' });
   

  } catch(e){
      console.log(e);
  }
});

async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM }) {
  
   
  const transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          auth: {
            user: process.env.USER, // generated ethereal user
            pass: process.env.PASS // generated ethereal password
          }
  })
      
 
 await transporter.sendMail({ from, to, subject, html });
 
  console.log("email sent sucessfully");
      
  };
async function sendPasswordResetEmail(email, resetToken, origin) {
    let message;
     
    if (origin) {
        const resetUrl = `${origin}/apiRouter/resetPassword?token=${resetToken} email=${email}`;
        message = `<p>Please click the below link to reset your password, the following link will be valid for only 1 hour:</p>
                   <p><a href="${resetUrl}">${resetUrl}</a></p>`;
    } else {
        message = `<p>Please use the below token to reset your password with the <code>/apiRouter/reset-password</code> api route:</p>
                   <p><code>${resetToken}</code></p>`;
    }
 
    await sendEmail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: ' Reset your Password',
        html: `<h4>Reset Password</h4>
               ${message}`
    });
}
//  Reset token validate
async function  validateResetToken  (req, res, next){
 
  const email = req.body.email;
  const resetToken = req.body.token;
   
   
  
  if (!resetToken || !email) {
      return res.sendStatus(400);
     }

  // then we need to verify if the token exist in the resetPasswordToken and not expired.
  const currentTime =  new Date(Date.now());
   
  const token = await db.findValidToken(resetToken, email, currentTime);
  
   
  if (!token) { 
    res.json ( 'Invalid token, please try again.');
  }

  next();
  };
  
router.post('/resetPassword', validateResetToken, async(req, res, next)=>{
  try{
      
      const newPassword = req.body.password;
      const email = req.body.email;
       
      if  (!newPassword) {
        return res.sendStatus(400);
       }
   
     const user = await db.getUserByEmail(email);

     const salt = genSaltSync(10);
     const  password = hashSync(newPassword, salt);
      
     await db.updateUserPassword(password, user.id);
      
     res.json({ message: 'Password reset successful, you can now login with the new password' });

  } catch(e){
      console.log(e);
  }
 })

module.exports = router;