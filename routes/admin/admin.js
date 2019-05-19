const express    = require("express");
const router     = express.Router();
const db         = require("../../util/mysqlcon.js");
const bodyParser = require("body-parser");

router.use(bodyParser.urlencoded({extended: false}));

//domain name path variable for different environment using
let domainPath = "http://localhost/";


//Define upload photo field for product middleware
const awsS3Upload  = require("../../util/multer.js");
let mutiPhotosUpload = awsS3Upload.fields([
  { name: 'mainPhoto', maxCount: 1 },
  { name: 'otherPhoto', maxCount: 5 }])

//Admin add new product basic information middleware
router.post('/createProduct', mutiPhotosUpload, function (req, res) {
  const { assign_id }   = req.body;
  const { title }       = req.body;
  const { description } = req.body;
  const price           = parseFloat(req.body.price);
  const { texture }     = req.body;
  const { wash }        = req.body;
  const { place }       = req.body;
  const { category }    = req.body;
  const { note }        = req.body;
  const { story }       = req.body;
  const mainPhotoPath   = req.files.mainPhoto[0].location; //photo stored path
  const otherPhotosPath = req.files.otherPhoto; //photos stored path array
  const prePage         = 'createProduct.html'; //previous page of add new product  
  
  //check new product id if existed
  let queryProductSQL = "SELECT * FROM product WHERE assigned_id = '" + assign_id + "'";
  db.query(queryProductSQL, (err, queryProductResult) => {
    if(err) throw err;

    if ( queryProductResult[0] ) {
      queryProductResult = title + "產品已經存在";
      res.render('result', {result: queryProductResult, prePage: prePage});

    } else{
      //if new product it doesn't exit in MTSQL. Insert new product information in MYSQL
      let insertMainPhotoSQL = "INSERT INTO product(assigned_id, title, description, price, texture, wash, place, category, note, story, main_image)";
      insertMainPhotoSQL    += " VALUES ('" + assign_id + "', '" + title + "', '" +  description + "', " + price + ", '" +  texture + "', '";
      insertMainPhotoSQL    +=  wash + "', '" +  place + "', '" + category + "', '" +  note + "', '" +  story + "', '" +  mainPhotoPath + "')";

      db.query(insertMainPhotoSQL, (err, insertMainPhotoResult) => {
        if(err) throw err;

        if ( insertMainPhotoResult.insertId === 0 ){ // Return insert data id = 0 if insert successflly, don't assigned id so id always equal to zere
          //loop photos stored path array and adding to sql one by one
          for (let i = 0; i < otherPhotosPath.length; i++ ) {
            //add other photos to product
            let otherFilePath  = otherPhotosPath[i].location;
            let insertOtherPhotoSQL = "INSERT INTO images(product_id, image_path)";
            insertOtherPhotoSQL    += " VALUES ('" + assign_id + "', '" + otherFilePath + "')";

            db.query(insertOtherPhotoSQL, (err, insertOtherPhotoResult) => {
              if(err) throw err;
              if ( insertOtherPhotoResult.insertId ){ // Return insert data id if insert successflly
                if ( i === otherPhotosPath.length - 1 ) {
                  insertOtherPhotoResult = "成功新增" + title;
                  res.render('result', {result: insertOtherPhotoResult, prePage: prePage});
                }
              }
            });
          }
        } else {
          res.render('result', {result: title + "新增失敗", prePage: prePage});//插入 product 失敗
        }
      });
    }
  }); 
});



//新增 產品庫存 (顏色，尺寸，數量)
router.post('/addProductStock', async function (req, res) {
  const assign_id     = req.body.main_assign_id;
  const title         = req.body.mainTitle;
  const { colorCode } = req.body;
  const { colorName } = req.body;
  const { size }      = req.body;
  const { quantity }  = req.body;
  const prePage       = 'addProductStock.html'; //previous page of add product stock page

  let responseText="";


  //查詢 product table 內是否有需要新增庫存的 productID, 若沒有則不新增
  let queryProductSQL = "SELECT * FROM product WHERE assigned_id = '" + assign_id + "'";
  let queryProductResult = await sqlQuery(queryProductSQL);

  if (!queryProductResult[0]) {
    responseText = title + "產品不存在";
    res.render('result', {result: responseText, prePage: prePage});

  } else {
    //處理顏色
    let queryColorSQL = "SELECT * FROM color WHERE color_code = '" + colorCode + "'";
    let queryColorSQLResult = await sqlQuery(queryColorSQL);
      // 檢查是否同樣色號存在不同名字
    for ( let i =0; i < queryColorSQLResult.length; i++ ) {
      //如果有出現同樣名字就不能存入SQL
      if (queryColorSQLResult[i].color_code === colorCode && queryColorSQLResult[i].color_name !== colorName) {
        responseText = "此色號已經存在但跟您輸入的名稱不同請確認哪個正確: " + queryColorSQLResult[i].color_name + " 還是 " +  colorName;
        res.render('result', {result: responseText, prePage: prePage});
      }
    }

    if (!queryColorSQLResult[0]) {
      //新增color
      let insertColorSQL = "INSERT INTO color (color_code, color_name)";
      insertColorSQL    += " VALUES ('" + colorCode + "', '" + colorName + "')";
      let insertColorSQLResult = await sqlQuery(insertColorSQL);
    }

    let existedSize = []; //檢查出已經存在 MYSQL 的 size 會存進來
    let addedSize   = []; //檢查出不存在 MYSQL 的 size 會加入 SQL 後存進來

    for ( let i=0; i<size.length; i++) {
      //確認此商品是否存在
      let queryStockSQL = "SELECT * FROM stock WHERE product_id = '"; 
      queryStockSQL    += assign_id + "' AND color_code = '" + colorCode + "' AND size = '" + size[i] + "'";
      
      let queryStockSQLResult = await sqlQuery(queryStockSQL);
      if ( queryStockSQLResult[0] ) {

        existedSize.push([size[i],quantity[i]]);

        if ( i===size.length-1 ) {
          responseText = createResult(title, existedSize, addedSize);
          res.render('result', {result: responseText, prePage: prePage});
        }
        
      } else { //不在的話會新增產品庫存
        let insertStockSQL = "INSERT INTO stock (product_id, color_code, size, quantity)";
        insertStockSQL    += " VALUES ('" + assign_id + "', '" + colorCode + "', '" + size[i] + "', '" + quantity[i] + "')";

        let insertStockSQLResult = await sqlQuery(insertStockSQL);

        addedSize.push([size[i],quantity[i]]);
          
        if ( i===size.length-1 ) {
          queryColorSQLResult = createResult(title, existedSize, addedSize);
          res.render('result', {result: queryColorSQLResult, prePage: prePage});
        }             
      }
    } 
  }

});

//產生結果訊息
function createResult(productName, existedSize, addedSize) {
  let resultSentence=productName;

  if ( existedSize[0] ) {
    for ( let i=0; i< existedSize.length; i++) {
      resultSentence += existedSize[i][0]+", ";
    }
    resultSentence += "庫存資料已經存在，若要更新數量資訊請去更新頁面處理<br>";
  }

  if ( addedSize[0] ) {
    resultSentence += "成功新增" + productName + "庫存資料: <br>";

    for ( let j=0; j< addedSize.length; j++) {
      resultSentence += "尺寸: " + addedSize[j][0] + ", 數量: " + addedSize[j][1] + "<br>";
    }
  }

  return resultSentence
}

//Promise MYSQL Query
function sqlQuery (query1) {
  return new Promise ((reso, rej) => {
    db.query(query1,(err, result) => {
        if (err) {
            rej(err);
        }
        else {
            reso(result);
        }
    });
  });
}

module.exports = router;