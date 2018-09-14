const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const bodyParser = require('body-parser')
const path = require('path')
const config = require('config')

const home = require('./routes/home')
const user = require('./routes/user')
const login = require('./routes/login')

const app = express()


app.use(session({ 
    secret: 'example secret dog cat',
    saveUninitialized: false,
    resave: false
}))
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.set('view engine', 'pug')
app.set("views", path.join(__dirname, "views"))

// add routers here
app.use('/', home)
app.use('/user', user)
app.use('/login', login)

app.listen(3000, 'localhost', () => {
    console.log('Listening at 3000')
})