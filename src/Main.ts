const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const jwtStrategy = require('passport-jwt').Strategy;
const extractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');

import 'reflect-metadata';
import { json } from 'express';
import { createConnection, getManager } from 'typeorm';
import { graphqlHTTP } from 'express-graphql';
import { createExpressServer } from 'routing-controllers';
import { MainController } from './controller/MainController';
import { PlayerController } from './controller/PlayerController';
import { TeamController } from './controller/TeamController';
import { StockController } from './controller/StockController';
import { StockResolver } from './resolver/StockResolver';
import { buildSchema } from 'type-graphql';
import { CorsMiddleware } from './middleware/CorsMiddleware';
import { User } from './entity/User';

createConnection().then(async () => {
    const app = createExpressServer({
        routePrefix: '/api',
        cors: false,
        controllers: [
            MainController,
            PlayerController,
            TeamController,
            StockController,
        ],
        middlewares: [
            CorsMiddleware,
        ]
    });
    const port = 4000;

    app.use(json());

    const schema = await buildSchema({
        resolvers: [StockResolver]
    });

    app.use(
        '/graphql',
        graphqlHTTP({
            schema: schema,
            graphiql: true
        }),
    );

    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(new LocalStrategy(
        async function (username, password, done) {
            const userRepository = getManager().getRepository(User);

            const user = await userRepository.findOne({username: username});

            if (!user) {
                return done(null, false, {message: 'Incorrect username.'});
            }

            if (user.password !== password) {
                return done(null, false, {message: 'Incorrect password.'});
            }

            const payload = {
                sub: user.id
            };

            return done(null, user);
        }
    ));

    const opts = {
        jwtFromRequest: extractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: 'TOP_SECRET',
    };

    passport.use(new jwtStrategy(opts, async function (jwt_payload, done) {
        const userRepository = getManager().getRepository(User);

        const user = await userRepository.findOne({id: jwt_payload.sub});

        if (user) {
            return done(null, user);
        } else {
            return done(null, false);
        }
    }));

    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(async function (id, done) {
        const userRepository = getManager().getRepository(User);
        const user = await userRepository.findOne({id: id});

        done(null, user);
    });

    app.post('/login', passport.authenticate('local'), function (req, res, next) {
        return passport.authenticate('local', (err, user, info) => {
            if (err) {
                return;
            }

            const body = {id: user.id, username: user.username};
            const token = jwt.sign({user: body}, 'TOP_SECRET');

            return res.json({
                success: true,
                message: 'You have successfully logged in!',
                token,
                user: user,
                info: info
            });
        })(req, res, next);
    });

    passport.use(
        new jwtStrategy(
            {
                secretOrKey: 'TOP_SECRET',
                jwtFromRequest: extractJwt.fromUrlQueryParameter('secret_token')
            },
            async (token, done) => {
                try {
                    return done(null, token.user);
                } catch (error) {
                    return done(null, { verified: false })
                }
            }
        )
    );

    app.post('/verify', passport.authenticate('jwt', {'session': false}),
        function (req, res) {
            res.send({
                'verified': true,
            });
        }
    );

    app.listen(port, () => {
        console.log(`App listening at http://localhost:${port}`);
    });
});