//multer setting
const multer     = require('multer');

//AWS-S3
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');

aws.config.update({
    secretAccessKey: "secretAccessKey",
    accessKeyId: "accessKeyId",
    region: 'us-east-1'
});

const s3 = new aws.S3();

const awsS3Upload = multer({
	storage: multerS3({
		s3: s3,
		bucket: 'bucket-for-stylish/image',
		acl: 'public-read',
		metadata: function (req, file, cb) {
			cb(null, {fieldName: file.fieldname});
		},
		key: function (req, file, cb) {
			cb(null, Date.now() + '-' + file.originalname)
		}
	})
})

module.exports = awsS3Upload;