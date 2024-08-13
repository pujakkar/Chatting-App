const { validateToken } = require("../services/auth");

const socketAuth=async (error,socket,next)=>{
    const authToken= socket.request.cookies['token']

    if(!authToken) return next(new Error('no token provided'))

    try {
        const userPayload=validateToken(authToken)
        socket.user=userPayload
    } catch (error) {
    }

    return next()
}

module.exports={socketAuth}