const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const bodyParser = require('body-parser')
const validator = require('express-validator')
const path = require('path')
const config = require('config')

const home = require('./routes/home')
const user = require('./routes/user')
const login = require('./routes/login')
const project = require('./routes/project')
const logout = require('./routes/logout')

const app = express()

const isAUser = (req, res, next) => {
    if ((!req.session || !req.session.authenticated)) {
        res.redirect('/login')
        return
    }
    next()
}

app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(session({ 
    secret: 'example secret dog cat',
    saveUninitialized: false,
    resave: false,
}))
app.use(validator())
app.set('view engine', 'pug')
app.set("views", path.join(__dirname, "views"))

// add routers here
app.use('/login', login)
app.use(isAUser)
app.use('/', home)
app.use('/user', user)
app.use('/project', project)
app.use('/logout', logout)

app.listen(3000, 'localhost', () => {
    console.log('Listening at 3000')
})