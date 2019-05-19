const express   = require('express');
const router    = express.Router();
const db        = require("../../util/mysqlcon.js");
const cache     = require('../../public/js/cache.js');

//AWS-S3 multer module
const awsS3Upload  = require("../../util/multer.js");
const singleUpload = awsS3Upload.single('picture');


//campaign routes 測試路徑
router.get('/', (req, res) => {
	res.send('success!');
});

//新增 marketing campaing 
router.post('/createcampaign',  function ( req, res ) {	
	// 輸出後 pug 頁面所需資料 
    let prePage = '/admin/campaign.html';

	singleUpload( req, res, function( err ) {
		if (err) {
			res.render('result', {errors: {result: err.message, prePage: prePage}});
		
		} else {
			const { assign_id }   = req.body;
			const { story }       = req.body;

			//新增 照片路徑
			const campaignPhotoPath = req.file.location;
			
			//SQL insert
			let queryProductSQL = "SELECT assigned_id FROM product WHERE assigned_id = '" + assign_id + "'";
			db.query(queryProductSQL, (err, result) => {
				if(err) throw err;
				
				if ( !result[0] ) {
					result = assign_id + "產品不存在";
					res.render('result', {result: result, prePage: prePage});

				} else{
					let insertSQL = "INSERT INTO campaigns(product_id, picture, story)";
					insertSQL    += " VALUES ('" + assign_id + "', '" + campaignPhotoPath + "', '" + story  + "')";

					db.query(insertSQL, (err, createCampaignResult) => {
						if(err) throw err;		
						//render 新增完頁面
						createCampaignResult  = '成功新增 ' + assign_id + '';

						//全域變數 Cache API
						let queryCampaignsSQL = "SELECT * FROM campaigns";
						db.query(queryCampaignsSQL, (err, result) => {
							cache.regist('marketing');
							cache.put('marketing', 'campaigns', {"data":result});
							cache.get('marketing', 'campaigns');
							res.render('result', { result: createCampaignResult, prePage: prePage });
						});
					});
				}
			});
		}
	}) 
});

module.exports = router;