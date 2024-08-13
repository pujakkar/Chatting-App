const {Message}=require('../model/message')
const {Chat}=require('../model/chat')
const {uploadToCloudinary}=require('../utils/features')
const {emitEvents}=require('../utils/features')
const {NEW_MESSAGE, REFETCH_CHATS, GROUP_LEFT } = require('../events/event')

const newGroup=async (req,res)=>{
    const {name,members}=req.body

    if(members.length<2){
        return res.json({message:'members must be greater than 2'})
    }
    try {
        
    const allMembers=[...members,req.user._id]
    

    await Chat.create({
        name,
        groupChat:true,
        creator:req.user,
        members:allMembers
    })

    emitEvents(req,REFETCH_CHATS,allMembers)
    return res.json({message:'group created'})
    } catch (error) {
        return res.json({message:error.message})
    }
}

const getMyChats=async (req,res)=>{

    const userId=req.user._id
    // console.log(req.user)
    const allMyChats=await Chat.find({members:userId}).populate("members", "avatar fullName")

    const transformChats=allMyChats.map(({_id,name,groupChat,members,creator})=>{

        const otherMembers=members.filter((member)=>member._id.toString()!==userId.toString())
        return {
            _id,
            name:groupChat?name :otherMembers[0].fullName,
            groupChat,
            creator:creator?creator:null,
            avatar:groupChat?otherMembers.slice(0,3).map(({avatar})=>avatar.url) :[otherMembers[0].avatar.url] ,
            members:members,
        }
    })

    return res.json({message:'found',transformChats})
}

const getMyGroups=async(req,res)=>{
    const userId=req.user._id

    const allMyGroups=await Chat.find({members:userId,groupChat:true}).populate('members','avatar fullName')

    const transformChats=allMyGroups.map(({_id,name,groupChat,members,creator})=>{

        const otherMembers=members.filter((member)=>member._id.toString()!==userId.toString())
        return {
            _id,
            name,
            groupChat,
            creator,
            avatar:otherMembers.slice(0,3).map(({avatar})=>avatar.url) ,
            members:members,
        }
    })

    return res.json({message:'found',transformChats})
}
const addNewMembers=async(req,res)=>{
    const {chatId,membersAdd}=req.body

   // console.log(req.body)

    await Chat.findByIdAndUpdate(chatId,{$addToSet:{members:{ $each:membersAdd}}},{new:true})

    const chat=await Chat.findById(chatId)
    // console.log(chat.members)

    emitEvents(req,REFETCH_CHATS,chat.members)

    return res.json({message:'added successfully'})


}

const removeMembers=async(req,res)=>{
    const {chatId,membersToRem}=req.body

    const chat=await Chat.findById(chatId)
    const allMembers=chat.members

    await Chat.findByIdAndUpdate(chatId,{$pull:{members:{$in:membersToRem}}},{new:true})
    
    emitEvents(req,REFETCH_CHATS,allMembers)
    return res.json({message:'removed successfully'})
}

const leaveGroup=async(req,res)=>{
    const chatId=req.params.id

    const chat=await Chat.findById(chatId)
    const allMembers=chat.members

    chat.members.pull(req.user._id);

    if(chat.creator.toString()===req.user._id.toString()){
        await chat.deleteOne()
        return res.json({message:'chat left'})
    }

    await chat.save()
    emitEvents(req,REFETCH_CHATS,allMembers)

    return res.json({message:'chat left',chat,user:req.user._id})
}

const sendAttachments=async(req,res)=>{
    const {chatId}=req.body

    const files=req.files

    //console.log(files)

    const chat=await Chat.findById(chatId)

    const messageDb={
        content:"",
        attachments:await uploadToCloudinary(files),
        sender:req.user._id,
        chat:chatId,
    }


    const messageForReal={
        ...messageDb,
        sender:{
            _id:req.user._id,
            name:req.user.fullName,
        },
    }
    // console.log(messageForReal)
    emitEvents(req,NEW_MESSAGE,chat.members,{
        message:messageForReal,
        chatId,
    })
    console.log(messageForReal)

    const message=await Message.create(messageDb)
    return res.json({message:"sent",chatId})
}

const getChatDetail=async(req,res)=>{
    const chatId=req.params.id
    const chat=await Chat.findById(chatId).populate('members','avatar fullName')

    return res.json({message:'chat details fetched',chat})

}

const renameGroup=async (req,res)=>{
    const chatId=req.params.id
    // console.log(chatId)
    const {name}=req.body
    // console.log(req.body)
    const chat=await Chat.findById(chatId)

    // if(chat.creator!==req.user._id){
    //     return res.json({message:'you are not allowed to rename the group'})
    // }
    // if(!chat.members.includes(req.user._id)){
    //     return res.json({message:'you are not allowed to change the group name'})
    // }
    chat.name=name

    await chat.save()

    emitEvents(req,REFETCH_CHATS,chat.members)

    return res.json({message:'name updated'})

}

const deleteChat=async(req,res)=>{
    const chatId=req.params.id

    const chat=await Chat.findById(chatId)


    const members=chat.members
    // if(chat.creator!==req.user._id){
    //     return res.json({message:'you are not allowed to delete the group'})
    // }
    // if(!members.includes(req.user._id)){
    //     return res.json({message:'you are not allowed to delete the group'})
    // }

    const messageWithAttachments=await Message.find(
        {
            chat:chatId,
            attachments:{$exists:true,$ne:[]}
        },
    )
    //console.log(messageWithAttachments)

    const publicIds=[]
    messageWithAttachments.forEach(({public_id})=>publicIds.push(public_id))


    await Promise.all([
        //deleteFilesCloudinary(publicIds),
        chat.deleteOne(),
        //Message.deleteMany({chat:chatId})
    ])

    emitEvents(req,REFETCH_CHATS,members)
    return res.json({message:'deleted successfully'})

}


const getmessages=async(req,res)=>{
    const chatId=req.params.id
    const {page=1}=req.query

    const resultPerPage=15

    const skip=(page-1)*resultPerPage

    const chat=await Chat.findById(chatId)
    if(!chat.members.includes(req.user._id)){
        throw new Error('You are not allowed to access this group chat')
    }

    const [messages,totalMessageCount]=await Promise.all([
        Message.find({chat:chatId})
        .sort({createdAt:-1}) //newest messages are appearing first
        .skip(skip)
        .limit(resultPerPage)
        .populate('sender','fullName')
        .lean(),
        Message.countDocuments({chat:chatId})
    ])

    const totalPages=Math.ceil(totalMessageCount/resultPerPage) || 0

    return res.json({
        message:'message fetched',
        messages:messages.reverse(),  //newest messages at last page
        totalPages,
    })
}

module.exports={
    newGroup,
    getMyChats,
    addNewMembers,
    removeMembers,
    leaveGroup,
    sendAttachments,
    getChatDetail,
    renameGroup,
    deleteChat,
    getmessages,
    getMyGroups,
}