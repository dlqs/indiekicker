const Router = require('express-promise-router')
const crypto = require('crypto')
const { check, validationResult } = require('express-validator/check')
const router = new Router()

const db = require('../db')

router.get('/', (req, res, next) => {
    if (req.session.newuser) {
        res.render('sign-in', { success: ['<strong>Success!</strong> Log in to your new account.']})
    } else {
        res.render('sign-in')
    }
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
    check('username').isAlphanumeric().isLength({ min: 6 }),
    check('password').isLength({ min: 6}),
    check('email').isEmail(),
    check('name').isAlpha(),
    ], async (req, res, next) => {
        errors = validationResult(req).array().map(obj => {
            return `<strong>Error:</strong> ${obj.param} has ${obj.msg.toLowerCase()}`
        })
        // express validator cannot compare with other fields in same body
        if (req.body.password !== req.body.passwordconfirm) {
            errors.push('<strong>Error:</strong> passwords do not match')
        }

        // check username, email unique
        const usernameResult = await db.query('SELECT * from users WHERE username=lower($1)', [req.body.username])
        if (usernameResult.rows.length > 0) errors.push('<strong>Error:</strong> username already taken')
        const emailResult = await db.query('SELECT * from users WHERE email=lower($1)', [req.body.email])
        if (emailResult.rows.length > 0) errors.push('<strong>Error:</strong> email already taken')

        // send back
        if (errors.length !== 0) {
            res.render('register', { error: errors })
            return
        }

        try {
            const result = 
                await db.query('INSERT INTO users VALUES (default, $1, lower($2), lower($3), md5($4)::uuid, false, now(), NULL, NULL )',
                [req.body.name, req.body.username, req.body.email, req.body.password])
        } catch (error) {
            console.log(error)
            return
        }
        req.session.newuser = true
        res.redirect('sign-in')
})


module.exports = router