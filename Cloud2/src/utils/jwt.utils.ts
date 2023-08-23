import jwt from 'jsonwebtoken'
import config from '../../config/defaults';

const privateKey = config.accessTokenPrivateKey;
const publicKey = config.accessTokenPublicKey;
export function signJwt(object: Object, options?: jwt.SignOptions | undefined){
    return jwt.sign(object, privateKey, {
        ...(options && options),
        algorithm: 'RS256' //to allow us use private and public keys
    })

}

export function verifyJwt(token: string){
    try{
        //=>error originates here when accesstoken expires, maybe it has something to do with the public and private keys. i am still trying to determine the issue
        // console.log(publicKey)
        const decoded = jwt.verify(token, publicKey )
        console.log("decode:")
    return {
        valid: true,
        expired: false,
        decoded
    };
    }catch(e:any){
     return {
        valid: false,
        expired: e.mesaage === "jwt has expired",
        decoded: null
    };
    }
    
}


function jwtTokens({ user_id, user_name, user_email }) {
    const user = { user_id, user_name, user_email}; 
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '20s' });
    const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '5m' });
    return ({ accessToken, refreshToken });
  }