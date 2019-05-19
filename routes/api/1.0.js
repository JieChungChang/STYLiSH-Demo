const express = require('express');
const router  = express.Router();
const db      = require("../../util/mysqlcon.js");
const pool    = require("../../util/mysqlconPool.js");

const cache   = require('../../public/js/cache.js');

const redis   = require("redis");
const client  = redis.createClient(); 
client.on('connect', function() {
    console.log('RDB connected');
});

router.get('/', (req, res) => {
	res.send('success!');
});

//製作 Product 回傳的 JSON
function createProductObj(objFromSQL, colorResult, sizeResult, stockResult, imgsResult) {
	var obj = {};
	//基本資料
	obj.id          = objFromSQL.assigned_id
	obj.category    = objFromSQL.category
	obj.title       = objFromSQL.title
	obj.description = objFromSQL.description
	obj.price       = objFromSQL.price
	obj.texture     = objFromSQL.texture
	obj.wash        = objFromSQL.wash
	obj.place       = objFromSQL.place
	obj.note        = objFromSQL.note
	obj.story       = objFromSQL.story
	
	//顏色
	obj.colors      = [];
	for ( let j = 0; j < colorResult.length; j++ ) {
		obj.colors.push({"name": colorResult[j].color_name, "code":colorResult[j].color_code});
	}

	//尺寸
	obj.sizes       = [];
	for ( let j = 0; j < sizeResult.length; j++ ) {
		obj.sizes.push(sizeResult[j].size);
	}

	//庫存
	obj.variants    = [];
	for ( let j = 0; j < stockResult.length; j++ ) {
		obj.variants.push({"color_code":stockResult[j].color_code, "size":stockResult[j].size, "stock":stockResult[j].quantity});
	}

	//主照片
	obj.main_image  = objFromSQL.main_image;
	
	//次要照片
	obj.images      = [];
	for ( let j = 0; j < imgsResult.length; j++ ) {
		obj.images.push(imgsResult[j].image_path);
	}

	return obj;
}

//從 SQL 找出組成 product JSON 所需的所有資料
function sqlQuery(res, queryProductSQL, paging, category) {
	let pageItemLimit = 6;
	let finalObj = {}; //最後會回傳的資料
	let data     = []; //data

	pool.getConnection(function(err, connection) {
		if( err ) throw err;

		connection.query(queryProductSQL, (err, result) => {
			if(err) throw err;

			if ( !result[0] ) {
				connection.release();
				result = "product 資料表內沒有東西喔";
				res.send(result);

			} else{
				//處理 paging
				let pageCount = Math.ceil(result.length/pageItemLimit);      // 3為每頁資料最大數限制
				const pagingStart  = pageItemLimit * paging;
				let pagingEnd;
				let nextPaging;

				if ( paging === pageCount -1 ) {                //如果是最後一頁 就直接用整數當作 迴圈 END
					pagingEnd  = result.length;
					
				} else if ( paging < pageCount -1 ) {           //如果不是最後一頁但是比最後一頁小  就顯示三筆
					pagingEnd       = pagingStart + pageItemLimit;
					nextPaging      = paging + 1;
					finalObj.paging = nextPaging;
				
				} else {										//如果超過最後一頁  就顯示錯誤
					connection.release();

					res.send({"error": "Out of data."});
				}

				for ( let i = pagingStart; i < pagingEnd; i++) {
					let queryProductColorDistinctSQL = "SELECT DISTINCT stock.color_code, color.color_name FROM stock, color";
					queryProductColorDistinctSQL    += " WHERE stock.color_code = color.color_code AND stock.product_id = '" + result[i].assigned_id + "'";
					connection.query(queryProductColorDistinctSQL, (err, colorResult) => {
						if ( !colorResult[0] ) {
							result = "stock 資料表內沒有color喔";

							connection.release();

							res.send(result);
						
						} else {
							let queryProductSizeDistinctSQL = "SELECT DISTINCT size FROM stock";
							queryProductSizeDistinctSQL    += " WHERE product_id = '" + result[i].assigned_id + "'";
							
							connection.query(queryProductSizeDistinctSQL, (err, sizeResult) => {
								if ( !sizeResult[0] ) {
									result = "stock 資料表內沒有size喔";

									connection.release();

									res.send(result);
						
								} else {
									let queryProductVarientSQL = "SELECT color_code, size, quantity FROM stock";
									queryProductVarientSQL    += " WHERE product_id = '" + result[i].assigned_id + "'";
									connection.query(queryProductVarientSQL, (err, stockResult) => {
										if ( !stockResult[0] ) {
											result = "stock 資料表內沒有varient資料喔";

											connection.release();

											res.send(result);
						
										} else {
											let queryProductOtherImgSQL = "SELECT image_path FROM images";
											queryProductOtherImgSQL    += " WHERE product_id = '" + result[i].assigned_id + "'";
											connection.query(queryProductOtherImgSQL, (err, imgsResult) => {
												if ( category === "details" ) {
													if ( i === pagingEnd -1 ) {
														finalObj.data   = createProductObj(result[i], colorResult, sizeResult, stockResult, imgsResult);
														
														client.set(result[i].assigned_id, JSON.stringify(finalObj), (error) => {
															if(error) throw error;
															connection.release();
															res.send(finalObj);
														});
													}

												} else if ( category === 'allwithcache' ) {
													data.push(createProductObj(result[i], colorResult, sizeResult, stockResult, imgsResult));

													if ( i === pagingEnd -1 ) {
														finalObj.data   = data;
														
														client.set('all', JSON.stringify(finalObj), (error) => {
															if(error) throw error;
															connection.release();
															res.send(finalObj);
														});
													}												

												} else {
													data.push(createProductObj(result[i], colorResult, sizeResult, stockResult, imgsResult));

													if ( i === pagingEnd -1 ) {
														finalObj.data   = data;
														connection.release();
														res.send(finalObj);
													}
												}

											});
										}
									});
								}

							});
						}
					});
				}
			}
		});
	});
} 

function campaignSQLQuery(res, queryAllCampaignSQL){
	let finalObj = {}; //最後會回傳的資料

	pool.getConnection(function(err, connection) {
		if( err ) throw err;

		connection.query(queryAllCampaignSQL, (err, result) => {
			if(err) throw err;

			if ( !result[0] ) {
				result = "目前沒有任何活動";
				connection.release();
				res.send(result);

			} else{
				finalObj.data = result;
				cache.put('marketing', 'campaigns',finalObj);
				connection.release();
				res.send(finalObj);
			}
		});
	});
}

//product routes
router.get('/products/:category', (req, res) => {
	const { category }  = req.params;
	let paging          = parseInt(req.query.paging);

	if ( !paging ) {
		paging = 0;
	} 
	
	if ( category === 'allwithcache' ) {
		client.get('all', (error, rdbResult) => {
			if (error) {
				throw error;
			}

			if ( rdbResult ) {
				rdbResult = JSON.parse(rdbResult);
				res.send(rdbResult);

			} else {
				let queryAllProductSQL = "SELECT * FROM product";
				sqlQuery(res, queryAllProductSQL, paging, category);
			
			}
		});

	} else if(  category === 'allwithoutcache'  || category === 'all' ){
		let queryAllProductSQL = "SELECT * FROM product";
		sqlQuery(res, queryAllProductSQL, paging, category);

	} else if ( category === 'men' ) {
		let queryMenProductSQL = "SELECT * FROM product WHERE category = 'men'";
		sqlQuery(res, queryMenProductSQL, paging, category);

	} else if ( category === 'women' ) {
		let queryWomenProductSQL = "SELECT * FROM product WHERE category = 'women'";
		sqlQuery(res, queryWomenProductSQL, paging, category);

	} else if ( category === 'accessories' ) {
		let queryWomenProductSQL = "SELECT * FROM product WHERE category = 'accessories'";
		sqlQuery(res, queryWomenProductSQL, paging, category);

	} else if ( category === 'search' ) {
		const { keyword } = req.query;
		
		let queryKeywordProductSQL = "SELECT * FROM product WHERE title LIKE '%" + keyword + "%'";

		sqlQuery(res, queryKeywordProductSQL, paging, category);

	} else if ( category === 'details' ) {
		const { id } = req.query;

		client.get(id, (error, rdbResult) => {

			if (error) {
				throw error;
			}

			if ( rdbResult ) {
				rdbResult = JSON.parse(rdbResult);
				res.send(rdbResult);
			} else {
				let queryDetailProductSQL = "SELECT * FROM product WHERE assigned_id = '" + id + "'";
				sqlQuery(res, queryDetailProductSQL, paging, category);	
			}
		});	

	} else {
		res.send({"error": "Invalid token."});

	}
});

//campaign routes
router.get('/marketing/campaigns', (req, res) => {
	cache.regist('marketing');//cache 用 全域變數實作

	if ( !cache.query('marketing', 'campaigns') ){

		let queryAllCampaignSQL = "SELECT * FROM campaigns";
		campaignSQLQuery(res, queryAllCampaignSQL);

	} else {
		res.send(cache.get('marketing', 'campaigns'));
	}

});

module.exports = router;