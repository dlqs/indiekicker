const Router = require('express-promise-router')
const crypto = require('crypto')
const { check, validationResult } = require('express-validator/check')
const router = new Router()

const db = require('../db')

router.get('/', (req, res, next) => {
    res.render('sign-in')
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
            res.render('sign-in', { warning: ['<strong>Warning!</strong> Incorrect username or password.'] })
        }
    }
})

router.get('/register', (req, res, next) => {
    res.render('register')
})

router.post('/register', [
    check('username').isAlphanumeric().isLength({ min: 5 }),
    check('password').isLength({ min: 5}),
    check('email').isEmail(),
    check('name').isAlpha(),
    ], async (req, res, next) => {
        // express validator cannot check other fields
        if (req.body.password !== req.body.passwordconfirm) {
            res.render('register', { error: ['<strong>Error:</strong> Passwords do not match'] })
        }
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            console.log(errors.array())
            res.render('register', { error: errors.array().map(obj => 
                `<strong>Error:</strong> ${obj.param} has ${obj.msg.toLowerCase()}`) })
        }
        res.render('sign-in', { success: ['Log in to your new account.'] })
})

module.exports = router