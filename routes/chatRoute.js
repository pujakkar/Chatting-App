const express=require('express')
const {multerUpload}=require('../middlewares/multer')
const {newGroup,
    getMyChats,
    addNewMembers,
    removeMembers,leaveGroup,
    sendAttachments,
    getChatDetail,
    renameGroup,
    deleteChat,
    getmessages,
    getMyGroups
}= require('../controller/ChatControllers')


const Router=express.Router()

Router.route('/newGroup').post(newGroup)
Router.route('/myChats').get(getMyChats)
Router.route('/myGroups').get(getMyGroups)
Router.route('/addChats').put(addNewMembers)
Router.route('/removeChats').put(removeMembers)
Router.route('/leave/:id').delete(leaveGroup)
Router.route('/message').put(multerUpload.array('files',5),sendAttachments)
Router.route('/:id').get(getChatDetail).put(renameGroup).delete(deleteChat)
Router.route('/getMessage/:id').get(getmessages)

module.exports={Router}