const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const bodyParser = require('body-parser')
const path = require('path')
const config = require('config')

const home = require('./routes/home')
const user = require('./routes/user')

const app = express()

const verify = (req, res, next) => {
    if ((req.url === '/secure') && (!req.session || !req.session.authenticated)) {
        res.status(403).send('unauthorized')
        return
    }
    next()
}

app.use(session({ 
    secret: 'example secret dog cat',
    saveUninitialized: true,
    resave: true
}))
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(verify)
app.set('view engine', 'pug')
app.set("views", path.join(__dirname, "views"))

// add routers here
app.use('/home', home)
app.use('/user', user)

app.listen(3000, 'localhost', () => {
    console.log('Listening')
})