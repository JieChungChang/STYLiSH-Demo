const express = require('express');
const router  = express.Router();
const request = require('request');
const db      = require("../../util/mysqlcon.js");
const pool    = require("../../util/mysqlconPool.js");

//user routes 測試路徑
router.get('/', (req, res) => {
  res.send('success!');

});

function createUserObj(userProfile) {
  let userObj = {};
  userObj.id = userProfile.id;
  userObj.provider = userProfile.provider;
  userObj.name = userProfile.name;
  userObj.email = userProfile.email;
  userObj.picture = userProfile.picture;

  let dataObj = {};
  dataObj.access_token   = userProfile.access_token;
  dataObj.access_expired = Math.floor((userProfile.access_expired - Date.now())/1000);
  dataObj.user           = userObj;

  return dataObj
}

//profile routes
router.get('/profile', (req, res) => {
  // const access_token = req.cookies.access_token;
  const access_token = JSON.stringify(req.headers.authorization.substring(7));

  let reult   = '';
  let prePage = '/user/signup.html';
  pool.getConnection(function(err, connection) {

    let queryAccessTokenSQL = "SELECT * FROM users WHERE access_token = " + access_token;
    connection.query(queryAccessTokenSQL, (err, result) => {
      if(err) throw err;

      if ( !result[0] ) {
        // result = "Access Token 不存在 請登錄";
        // res.render('result', {result: result, prePage: prePage});
        result = {"error": "Token not existed."};
        connection.release();
        res.send(result);

      } else {

        const requestTime  = Date.now();
        if ( requestTime > result[0].access_expired ) {
          // result = "Access Token Expired";
          // res.render('result', {result: result, prePage: prePage});
          result = {"error": "Expired Token."};
          connection.release();
          res.send(result);

        } else {

          let finalObj = {}; //最後會回傳的資料
          finalObj.data = createUserObj(result[0]);
          connection.release();
          res.send(finalObj);

        }
      }
    });
  });
});

//sign up routes
router.post('/signup', (req, res) => {
  //Crypto setting 一定要放在 post request 裡面，不然 digest 會只能用一次
  const crypto = require('crypto');
  const passwordHash = crypto.createHash('sha256');
  const tokenHash = crypto.createHash('sha256');

  const { name }      = req.body;
  const { email }     = req.body;

  //處理 password hash 值 不讓user password 明碼存進去
  passwordHash.update(req.body.password);
  const hashPassword  = passwordHash.digest('hex');

  //處理 access_token hash 值
  const randomNumber = Math.random().toString(36).substring(7);
  //36是進位方式指定,從2到36進位,如果使用36進位就是等於10碼數字+26英文從第7個字開始抓，所以是13 - 7 = 6 個隨機數字+字母 
  tokenHash.update(randomNumber);
  const accessToken  = tokenHash.digest('hex');

  //輸出後 pug 頁面所需資料 
  let reult   = '';
  let prePage = '/user/signup.html';

  pool.getConnection(function(err, connection) {

    let queryUserExistSQL = "SELECT * FROM users WHERE email = '" + email + "' AND provider = 'native'";
    connection.query(queryUserExistSQL, (err, result) => {
      if(err) throw err;

      if ( result[0] ) {
        result = email + "已經存在";
        connection.release();
        res.send(result);

      
      } else {
        //定義時間
        const signUpTime  = Date.now();
        const expiredTime = signUpTime + 3600000;

        let insertUserSQL = "INSERT INTO users ( provider, name, email, password, access_token, access_expired, picture)";
        insertUserSQL    += " VALUES ('native', '" + name + "', '" + email  + "', '" + hashPassword + "', '" + accessToken + "'," + expiredTime + ", '')";

        connection.query(insertUserSQL, (err, result) => {
          if(err) throw err;    
          let queryUserSQL = "SELECT * FROM users WHERE email ='" + email + "' AND provider = 'native'";
          
          connection.query(queryUserSQL, (err, result) => {
            if(err) throw err;

            let finalObj = {}; //最後會回傳的資料
            finalObj.data = createUserObj(result[0]);
            res.cookie('access_token', result[0].access_token);
            connection.release();
            res.send(finalObj);
          });
        });
      }
    });
  });
});


//sign in routes
router.post('/signin', (req, res) => {
  //判斷登入 方式
  const { provider }     = req.body;
  
  if(provider === "Facebook") { // 用 Facebook 登入
    const { access_token } = req.body;

    //輸出後 pug 頁面所需資料 
    let reult   = '';
    let prePage = '/user/signup.html';

    let queryUserExistSQL = "SELECT * FROM users WHERE access_token = '" + access_token + "'";
    db.query(queryUserExistSQL, (err, result) => {
      if(err) throw err;
      //判斷是否有這個 Token
      if ( !result[0] ) { //沒有此 FB Token
        const signUpTime  = Date.now();
        const expiredTime = signUpTime + 3600000;

        //取得照片資料
        let url  = 'https://graph.facebook.com/v3.1/me?fields=id,name,picture,email&access_token=';
            url += access_token;
        //取得照片
        request.get(url, function (error, response, body) {
          let bodyObj = JSON.parse(body);
          let name    = bodyObj.name;
          let picture = bodyObj.picture.data.url; 
          let email   = bodyObj.email;

          //判斷原本有沒有此 FB email
          let queryEmailExistSQL = "SELECT * FROM users WHERE email = '" + email + "' AND provider = 'Facebook'";
          db.query(queryEmailExistSQL, (err, result) => {

            if ( result[0] ) { //如果 email 存在 就 update token
              let updateUserSQL = "UPDATE users SET access_token ='" + access_token + "', access_expired = " + expiredTime;
              updateUserSQL    += "  WHERE email = '" + email + "' AND provider = 'Facebook'";
              
              db.query(updateUserSQL, (err, result) => {
                if(err) throw err;    
                let queryUserSQL = "SELECT * FROM users WHERE access_token ='" + access_token + "'";
                
                db.query(queryUserSQL, (err, result) => {
                  if(err) throw err;

                  let finalObj = {}; //最後會回傳的資料
                  finalObj.data = createUserObj(result[0]);
                  res.cookie('access_token', result[0].access_token);
                  res.send(finalObj);
                });
              });

            } else {//如果 email 不存在 就 insert token

              let insertUserSQL = "INSERT INTO users ( provider, name, email, password, access_token, access_expired, picture)";
              insertUserSQL    += " VALUES ('" + provider + "', '" + name + "', '" + email + "', 'facebook', '";
              insertUserSQL    += access_token + "'," + expiredTime + ", '" + picture + "')";

              db.query(insertUserSQL, (err, result) => {
                if(err) throw err;    
                let queryFBUserSQL = "SELECT * FROM users WHERE access_token ='" + access_token + "'";
                
                db.query(queryFBUserSQL, (err, result) => {
                  if(err) throw err;

                  let finalObj = {}; //最後會回傳的資料
                  finalObj.data = createUserObj(result[0]);

                  res.send(finalObj);
                });
              });
            }//email 存不存在判斷式結尾

          });//email 搜尋
        });
      } else { //有這個 Token
          const signInTime  = Date.now();
          //確認 Token 是否過期，若過期就更新，若沒過期，就顯示使用者資訊
          if ( result[0].access_expired < signInTime ) {
            const expiredTime = signInTime + 3600000;

            let updateUserSQL = "UPDATE users SET access_expired = " + expiredTime + "  WHERE access_token = '" + access_token + "'";
            db.query(updateUserSQL, (err, result) => {
              if(err) throw err;    
              let queryUserSQL = "SELECT * FROM users WHERE access_token ='" + access_token + "'";
              
              db.query(queryUserSQL, (err, result) => {
                if(err) throw err;

                let finalObj = {}; //最後會回傳的資料
                finalObj.data = createUserObj(result[0]);
                res.cookie('access_token', result[0].access_token);
                res.send(finalObj);
              });
            });
          } else {
            let queryUserSQL = "SELECT * FROM users WHERE access_token ='" + access_token + "'";
            
            db.query(queryUserSQL, (err, result) => {
              if(err) throw err;

              let finalObj = {}; //最後會回傳的資料
              finalObj.data = createUserObj(result[0]);
              res.cookie('access_token', result[0].access_token);
              res.send(finalObj);
            });
          }
        }
    });



  } else { // 用 native 登入
    //Crypto setting 一定要放在 post request 裡面，不然 digest 會只能用一次
    const crypto        = require('crypto');
    const passwordHash  = crypto.createHash('sha256');
    const tokenHash     = crypto.createHash('sha256');

    const { email }     = req.body;

    //處理 password hash 值 不讓user password 明碼存進去
    passwordHash.update(req.body.password);
    const hashPassword  = passwordHash.digest('hex');

    //處理 access_token hash 值
    const randomNumber = Math.random().toString(36).substring(7);
    //36是進位方式指定,從2到36進位,如果使用36進位就是等於10碼數字+26英文從第7個字開始抓，所以是13 - 7 = 6 個隨機數字+字母 
    tokenHash.update(randomNumber);
    const accessToken  = tokenHash.digest('hex');

    //輸出後 pug 頁面所需資料 
    let reult   = '';
    let prePage = '/user/signup.html';

    let queryUserExistSQL = "SELECT * FROM users WHERE email = '" + email + "' AND provider = 'native'";
    db.query(queryUserExistSQL, (err, result) => {
      if(err) throw err;
      //判斷是否有此帳號
      if ( !result[0] ) {
        result = email + "不存在，請註冊新帳號";
        res.render('result', {result: result, prePage: prePage});
      
      } else {
        //判斷密碼是否正確
        if ( result[0].password === hashPassword ) {
          const signInTime  = Date.now();
          const expiredTime = signInTime + 3600000;

          let updateUserSQL = "UPDATE users SET access_token = '" + accessToken + "', access_expired = " + expiredTime;
          updateUserSQL    += " WHERE email = '" + email + "' AND provider = 'native'";

          db.query(updateUserSQL, (err, result) => {
            if(err) throw err;    
            let queryUserSQL = "SELECT * FROM users WHERE email ='" + email + "'";
            
            db.query(queryUserSQL, (err, result) => {
              if(err) throw err;

              let finalObj = {}; //最後會回傳的資料
              finalObj.data = createUserObj(result[0]);
              res.cookie('access_token', result[0].access_token);
              res.send(finalObj);
            });
          });
        } else {
          result = email + "密碼不符合，請重新登入";
          res.render('result', {result: result, prePage: prePage});

        }
      }
    });
  } 
});

module.exports = router;