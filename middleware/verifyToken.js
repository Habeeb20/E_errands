import jwt from "jsonwebtoken"

export const verifyToken = async(req, res, next) => {
    let token = req.headers('authorization')

    token = token.split(' ')[1]
    if(!token){
        console.log("you are not authorized")
        return res.status(401).json({message: "you are not authorized"})
    }
    
    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decode
        next()
    } catch (error) {
        console.log(error)
        return res.status(403).json({message: "token not valid"})
    }
}