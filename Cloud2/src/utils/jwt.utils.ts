import config from '../../config/defaults';

const privateKey = config.accessTokenPrivateKey;
const publicKey = config.accessTokenPublicKey;
import jwt, { SignOptions } from 'jsonwebtoken';

export function signJwt(payload: object, secretOrPrivateKey: string, options?: SignOptions): string {
    const mergedOptions: SignOptions = {
        ...(options || {}),
        algorithm: 'HS256'
    };

    return jwt.sign(payload, secretOrPrivateKey, mergedOptions);
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