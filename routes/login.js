const Router = require('express-promise-router')
const validator = require('express-validator')
const crypto = require('crypto')
const router = new Router()

const db = require('../db')

router.get('/', (req, res, next) => {
    res.render('login')
})

router.post('/', async (req, res, next) => {
    if (req.body.username && req.body.password) {
        const { rows } = await db.query("SELECT * FROM users WHERE username=$1 AND passworddigest=md5($2)::uuid", 
                                        [req.body.username, req.body.password])
        if (rows.length === 1) {
            // set session attributes, accessible from other parts of the site
            req.session.authenticated = true
            req.session.userid = rows[0].userid
            req.session.username = rows[0].username

            // update last login time
            await db.query("UPDATE users SET lastlogin=now() WHERE userid=$1", [req.session.userid])

            // set sessionid in cookie, valid for (lastlogin + 4 hours)
            await crypto.randomBytes(16, (err, buf) => {
                if (err) throw err
                req.session.id = buf.toString('hex')
                db.query("UPDATE users SET sessionid=$1 WHERE userid=$2", [req.session.id, req.session.userid])
            })

            res.redirect('/')
        } else {
            // error message
            res.redirect('back')
        }
    }
})

router.get('/register', (req, res, next) => {
    res.render('register')
})

router.post('/register', async (req, res, next) => {
})

module.exports = router