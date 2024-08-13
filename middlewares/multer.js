const multer=require('multer')
const multerUpload=multer({
    limits:{
        fileSize:1024 * 1024 *5,  //5 mb
    },
})

module.exports={multerUpload}