const express   = require('express');
const router    = express.Router();
const request   = require('request');
const https     = require('https');
const db=require("../../util/mysqlcon.js");

//order routes 測試路徑
router.get('/', (req, res) => {
  res.send('success!');

});


router.post('/checkout', (req, res) => {
  const prime        = req.body.prime;
  const shipping     = req.body.order.shipping;
  const payment      = req.body.order.payment;
  const subtotal     = req.body.order.subtotal;
  const freight      = req.body.order.freight;
  const total        = req.body.order.total;
  const recipient    = JSON.stringify(req.body.order.recipient);
  const product_list = JSON.stringify(req.body.list);

  //取得收件人資料 暫時讓這些資料跟 card ho
  const { name }    = req.body.order.recipient;
  const { phone }   = req.body.order.recipient;
  const { email }   = req.body.order.recipient;
  const { address } = req.body.order.recipient;

  const access_token = req.headers.authorization.substring(7);
  console.log(access_token);

  let queryUserSQL = "SELECT email FROM users WHERE access_token = '" + access_token + "'";
  db.query(queryUserSQL, (err, result) => {
    if(err) throw err;
    if ( result[0] ) { //token 的結帳。

      let purchaser_email = result[0].email;

      let insertOrderSQL  = "INSERT INTO customer_order ";
      insertOrderSQL += "( purchaser_email, paid, shipping, payment, subtotal, freight, total, recipient, product_list)";
      insertOrderSQL += " VALUES ('" + purchaser_email + "', 'unpaid', '" + shipping + "', '" + payment + "', " + subtotal  + ", " + freight;
      insertOrderSQL += ", " + total + ",'" + recipient + "', '" + product_list + "')";

      console.log(insertOrderSQL);

      db.query(insertOrderSQL, (err, result) => {
        if(err) throw err;
        
        let payment_id = result.insertId; //取得插入的 id

        const post_data = {
          // prime from front-end
          "prime": prime,
          "partner_key": "partner_PHgswvYEk4QY6oy3n8X3CwiQCVQmv91ZcFoD5VrkGFXo8N7BFiLUxzeG",
          "merchant_id": "AppWorksSchool_CTBC",
          "amount": subtotal,
          "currency": "TWD",
          "details": "Some clothes",
          "cardholder": {
              "phone_number": phone,
              "name": name,
              "email": email
          },
          "instalment": 0,
          "remember": false
        }

        const post_options = {
            host: 'sandbox.tappaysdk.com',
            port: 443,
            path: '/tpc/payment/pay-by-prime',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'partner_PHgswvYEk4QY6oy3n8X3CwiQCVQmv91ZcFoD5VrkGFXo8N7BFiLUxzeG'
            }
          }

        const post_req = https.request(post_options, function(response) {
          response.setEncoding('utf8');
          response.on('data', function (body) {
            let resResult = JSON.parse(body);
            let resobj    = resResult.status;
            
            if ( resobj === 0 ) {
              if(err) throw err;
              let updateOrderSQL = "UPDATE customer_order SET paid = 'paid' WHERE id = " + payment_id;
              db.query(updateOrderSQL, (err, updateOrderResult) => {
                if(err) throw err;
                let finalObj = {}; //最後會回傳的資料
                finalObj.data = { "number":payment_id};
                return res.send(finalObj);
              });
            } else {
              res.send("pay fail");
            }
          });
        });

        post_req.write(JSON.stringify(post_data));
        post_req.end();
      });

    } else { //沒有 token 的結帳，大致上與有 Token 的結帳方案一樣，可以重構此段。
      let insertOrderSQL  = "INSERT INTO customer_order ";
      insertOrderSQL += "( purchaser_email, paid, shipping, payment, subtotal, freight, total, recipient, product_list)";
      insertOrderSQL += " VALUES ('guest', 'unpaid', '" + shipping + "', '" + payment + "', " + subtotal  + ", " + freight;
      insertOrderSQL += ", " + total + ",'" + recipient + "', '" + product_list + "')";

      console.log(insertOrderSQL);

      db.query(insertOrderSQL, (err, result) => {
        if(err) throw err;
        let payment_id = result.insertId;

        const post_data = {
          // prime from front-end
          "prime": prime,
          "partner_key": "partner_PHgswvYEk4QY6oy3n8X3CwiQCVQmv91ZcFoD5VrkGFXo8N7BFiLUxzeG",
          "merchant_id": "AppWorksSchool_CTBC",
          "amount": subtotal,
          "currency": "TWD",
          "details": "Some clothes",
          "cardholder": {
              "phone_number": phone,
              "name": name,
              "email": email
          },
          "instalment": 0,
          "remember": false
        }

        const post_options = {
            host: 'sandbox.tappaysdk.com',
            port: 443,
            path: '/tpc/payment/pay-by-prime',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'partner_PHgswvYEk4QY6oy3n8X3CwiQCVQmv91ZcFoD5VrkGFXo8N7BFiLUxzeG'
            }
          }

        const post_req = https.request(post_options, function(response) {
          response.setEncoding('utf8');
          response.on('data', function (body) {
            let resResult = JSON.parse(body);
            let resobj    = resResult.status;
            
            if ( resobj === 0 ) {
              let updateOrderSQL = "UPDATE customer_order SET paid = 'paid' WHERE id = " + payment_id;
              db.query(updateOrderSQL, (err, updateOrderResult) => {
                if(err) throw err;
                let finalObj = {}; //最後會回傳的資料
                finalObj.data = { "number":payment_id };
                return res.send(finalObj);
              });
            } else {
              res.send("pay fail");
            }
          });
        });

        post_req.write(JSON.stringify(post_data));
        post_req.end();
      });   
    }
  })
});



module.exports = router;