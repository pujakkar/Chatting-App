const express=require('express')
const {handleLogin,handleSignUp,getMyProfile,logout,searchUser,sendRequest,acceptRequest,getMyNotifications,getMyFriends}=require('../controller/UserControllers')
const {multerUpload}=require('../middlewares/multer')
const multer = require('multer');

const upload=multer()

const Router=express.Router()

Router.route('/login').post(upload.none(),handleLogin)
Router.route('/signup').post(multerUpload.single('avatar'),handleSignUp)
Router.route('/userProfile').get(getMyProfile)
Router.route('/myFriends').get(getMyFriends)
Router.route('/logout').get(logout)
Router.route('/searchUser').get(searchUser)
Router.route('/sendReq').put(sendRequest)
Router.route('/acceptReq').put(acceptRequest)
Router.route('/getNotifications').get(getMyNotifications)

module.exports={Router}