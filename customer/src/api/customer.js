const CustomerService = require('../services/customer-service');
const  UserAuth = require('./middlewares/auth');
const { SubscribeMessage } = require('../utils');

const { expressjwt } = require('express-jwt')
const jwksRsa = require('jwks-rsa');
import { auth, requiredScopes } from 'express-oauth2-jwt-bearer';


module.exports = (app, channel) => {
    
    const service = new CustomerService();

    // To listen
    SubscribeMessage(channel, service);
    // const checkJwt = expressjwt({
    //     secret: jwksRsa.expressJwtSecret({
    //         jwksUri: new URL('/.well-known/jwks.json', process.env.AUTH0_ISSUER_BASE_URL).toString(),
    //         cache: true,
    //         rateLimit: true,
    //         jwksRequestsPerMinute: 10
    //     }),
    //     audience: process.env.AUTH0_AUDIENCE,
    //     issuer: process.env.AUTH0_ISSUER_BASE_URL, // must end with trailing slash
    //     algorithms: ['RS256']
    // })

    //OAuth Implementation

    // 1) Verify the Auth0 access token for your API

        const checkJwt = auth({
            audience: process.env.AUTH0_AUDIENCE,
            issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
            tokenSigningAlg: 'RS256',
        });

        // 2) Optional: check required scopes per route
        const needProfileRead = requiredScopes('read:profile');

    //End

    app.post('/signup', async (req,res,next) => {
        const { email, password, phone } = req.body;
        const { data } = await service.SignUp({ email, password, phone}); 
        res.json(data);

    });

    app.post('/login',  async (req,res,next) => {
        
        const { email, password } = req.body;

        const { data } = await service.SignIn({ email, password});

        res.json(data);

    });

    app.post('/address', UserAuth, async (req,res,next) => {
        
        const { _id } = req.user;


        const { street, postalCode, city,country } = req.body;

        const { data } = await service.AddNewAddress( _id ,{ street, postalCode, city,country});

        res.json(data);

    });
     
    app.get('/profile', checkJwt ,async (req,res,next) => {

        const { _id } = req.user;
        const { data } = await service.GetProfile({ _id });
        res.json(data);
    });
     

    app.get('/shoping-details', UserAuth, async (req,res,next) => {
        const { _id } = req.user;
       const { data } = await service.GetShopingDetails(_id);

       return res.json(data);
    });
    
    app.get('/wishlist', UserAuth, async (req,res,next) => {
        const { _id } = req.user;
        const { data } = await service.GetWishList( _id);
        return res.status(200).json(data);
    });

    app.get('/whoami', (req,res,next) => {
        return res.status(200).json({msg: '/customer : I am Calling from Customer Service'})
    })
}
