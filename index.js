const express    = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const https = require('https');
const fs = require('fs');

//file upload module config
const multer     = require('multer');
var mainStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads'); //file save path
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); //file save nameing rule
  }
});
const upload = multer({ storage: mainStorage });

const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());

//api routes
const apiRoutes = require('./routes/api/1.0');
app.use('/api/1.0', apiRoutes);

//使用者操作介面 routes
const userRoutes = require('./routes/api/user');
app.use('/api/1.0/user', userRoutes);

//訂單介面 routes
const orderRoutes = require('./routes/api/order');
app.use('/api/1.0/order', orderRoutes);

//管理員介面 routes
const adminRoutes = require('./routes/admin/admin');
app.use('/admin', adminRoutes);

//新增活動 routes
const campaignRoutes = require('./routes/admin/campaign');
app.use('/admin/campaign', campaignRoutes);

//載入 pug package
app.set('view engine', 'pug');

//載入 /admin || /user 下的 html || /uploads 下的照片
app.use('/', express.static('public'));
app.use('/admin', express.static('public/admin'));
app.use('/user', express.static('public/user'));
app.use('/public/uploads', express.static('public/uploads'));

//載入 https
// app.set('httpsport', 443);
// var options = {
// 	key: fs.readFileSync('/etc/letsencrypt/live/j-zone.xyz/privkey.pem'),
// 	cert: fs.readFileSync('/etc/letsencrypt/live/j-zone.xyz/cert.pem'),
// 	ca: fs.readFileSync('/etc/letsencrypt/live/j-zone.xyz/chain.pem')
// };
// var httpsServer = https.createServer(options, app);
// httpsServer.listen(app.get('httpsport'))
// httpsServer.on('error', onError);


app.listen(80, () => {
	console.log('Server started on port 80');
});