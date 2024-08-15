const express=require('express')
const dotenv=require('dotenv')
const {connectDb}=require('./utils/features')
const cookieParser=require('cookie-parser')
const UserRouter = require('./routes/userRoute').Router;
const ChatRouter = require('./routes/chatRoute').Router;
const {checkAuth}=require('./middlewares/checkAuth')
const http=require('http')
const {Server}=require('socket.io')
const {NEW_MESSAGE, NEW_MESSAGE_ALERT, START_TYPING}=require('./events/event');
const { Chat } = require('./model/chat');
const { Message } = require('./model/message');
const cors=require('cors')
const {socketAuth}=require('./middlewares/socketAuth')
const {v2:cloudinary}=require('cloudinary')
const {userToSocketIds}=require('./utils/socketMap')

dotenv.config({
    path:'./.env',
})
const PORT=process.env.PORT || 3000

connectDb(process.env.MONGO_URI)

const app=express()

const server=http.createServer(app)

const corsOptions = {
  origin: 'https://chatting-app-frontend-sand.vercel.app',
  credentials: true,
};

app.use(cors(corsOptions));


const io=new Server(server,{
    cors:{
        origin:['http://localhost:5173', 'https://chatting-app-frontend-sand.vercel.app' ],
        credentials:true
    }
})

app.set('io',io)



app.use(cors({
    origin:['http://localhost:5173','https://chatting-app-frontend-sand.vercel.app'],
    credentials:true
}))
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', 'https://chatting-app-frontend-sand.vercel.app');
//   res.header('Access-Control-Allow-Credentials', 'true');
//   next();
// });
app.options('*', cors(corsOptions));


app.use(express.urlencoded({extended:false}))
app.use(cookieParser())
app.use(express.json())
app.use(checkAuth('token'))
io.use((socket, next) => {
    cookieParser()(socket.request, socket.request.res, async (err) => {
        if (err) return next(err);
        await socketAuth(err, socket, next);
    });
});

io.on('connection', (socket) => {
    const user = socket.user;
    userToSocketIds.set(user._id.toString(), socket.id);
    
    // console.log(`User ${user._id} connected with socket ID: ${socket.id}`);
  
    socket.on(NEW_MESSAGE, async ({ chatId, message, attachments, members }) => {
      const userSockets = members.map((member) => userToSocketIds.get(member._id));
  
      const dbMessage = await Message.create({
        content: message,
        sender: user._id,
        attachments: attachments,
        chat: chatId,
      });
  
      const messageForRealTime = {
        content: message,
        attachments,
        sender: user,
        createdAt: dbMessage.createdAt,
        chat: chatId,
      };


      const chat=await Chat.findById(chatId).populate('members','fullName')

    //   console.log(socket.user)
      chat.members=chat.members.filter((user)=>user._id.toString()!==socket.user._id)
      io.to(userSockets).emit(NEW_MESSAGE, {
        chat: chatId,
        message: messageForRealTime,
      });
      //console.log(chat.members)
      io.to(userSockets).emit(NEW_MESSAGE_ALERT, { chat });
    });
  
    socket.on(START_TYPING, ({ chatId, members }) => {
      const users = members.map((user) => userToSocketIds.get(user._id));
      socket.to(users).emit(START_TYPING, { chatId });
    });
  
    socket.on('disconnect', () => {
    //   console.log(`User ${user._id} disconnected`);
      // Optionally remove the socket ID from the map on disconnect
      userToSocketIds.delete(user._id.toString());
    });
  });
  

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use('/user',UserRouter)
app.use('/chat',ChatRouter)


server.listen(PORT,()=>console.log(`server running on port ${PORT}`))

