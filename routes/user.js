const Router = require('express-promise-router')
const { check, validationResult, checkBody, getValidationResult } = require('express-validator/check')
const router = new Router()

const db = require('../db')

// time to live of user's session, in seconds
const TTL = 3600

// has to be authenticated as THE user, not just A user
const isTheUser = async (req, res, next) => {
    // check session id for:
    // matches userid AND less than 4 hours since last login
    // OR matches any userid who is admin

    // users can only access their own profile
    if (parseInt(req.params.id) === req.session.userid) {
        const userRows = await db.query("SELECT * FROM users WHERE userid=$1 AND sessionid=$2::bytea AND (EXTRACT(EPOCH FROM NOW()::timestamp) - EXTRACT(EPOCH FROM lastlogin) < $3)",
                                        [req.session.userid, req.session.id, TTL])
        if (userRows.rows.length !== 1) {
            // Either timeout or userid does not match sessionid in table (inconsistent.) // set sessionid to NULL
            await db.query('UPDATE users SET sessionid=NULL WHERE userid=$1', [req.session.userid])
            req.session.destroy()
            res.redirect('/login?timedout=true')
            return
        }
        next()
        return
    } else {
        // only admins can access everyones pages
        const adminRows = await db.query("SELECT * FROM users WHERE userid=$1 AND sessionid=$2::bytea AND (EXTRACT(EPOCH FROM NOW()::timestamp) - EXTRACT(EPOCH FROM lastlogin) < $3) AND admin=TRUE",
                                        [req.session.userid, req.session.id, TTL])
        if (adminRows.rows.length !== 1) {
            res.redirect('/user/' + req.session.userid)
            return
        }
        next()
        return
    }
}

// normal users go through this route.
router.use('/:id', isTheUser)

router.get('/:id', (req, res, next) => {
    res.render('user', {
        session: req.session
    })
})

router.post('/:id', [
    ], async (req, res, next) => {
        let errors = []
        // express validator cannot compare with other fields in same body
        if (req.body.name) {
            req.checkBody('name').isAlpha()
        }
        if (req.body.username) {
            req.checkBody('username').isAlphanumeric().isLength({ min: 6 })
            const usernameResult = await db.query('SELECT * from users WHERE username=lower($1)', [req.body.username])
            if (usernameResult.rows.length > 0) errors.push('<strong>Error:</strong> username already taken')
        }
        if (req.body.password && req.body.password !== req.body.passwordconfirm) {
            errors.push('<strong>Error:</strong> passwords do not match')
        }
        if (req.body.password) {
            req.checkBody('password').isLength({ min: 6})
        }
        if (req.body.email) {
            req.checkBody('email').isEmail()
            const emailResult = await db.query('SELECT * from users WHERE email=lower($1)', [req.body.email])
            if (emailResult.rows.length > 0) errors.push('<strong>Error:</strong> email already taken')
        }

        let vresults = await req.getValidationResult()
        vresults = vresults.array().map(obj => {
            return `<strong>Error:</strong> ${obj.param} has ${obj.msg.toLowerCase()}`
        })
        errors = errors.concat(vresults)

        // send back if errors
        if (errors.length !== 0) {
            res.render('user', { session: req.session, error: errors })
            return
        }

        // update session
        try {
            if (req.body.name) {
                await db.query('UPDATE users SET name=$1 WHERE userid=$2', [req.body.name, req.session.userid])
                res.session.name = req.body.name
            }
            if (req.body.username) {
                await db.query('UPDATE users SET username=$1 WHERE userid=$2', [req.body.username, req.session.userid])
                res.session.username = req.body.username
            }
            if (req.body.password) {
                await db.query('UPDATE users SET passworddigest=md5($1)::uuid WHERE userid=$2', [req.body.password, req.session.userid])
            }
            if (req.body.email) {
                await db.query('UPDATE users SET email=$1 WHERE userid=$2', [req.body.email, req.session.userid])
                res.session.email = req.body.email
            }
        } catch (error) {
            return
        }
        res.redirect('?updated=true')
})

// only admins go through this route.
router.get('/all', async (req, res, next) => {
    const adminRows = await db.query("SELECT * FROM users WHERE userid=$1 AND sessionid=$2::bytea AND (EXTRACT(EPOCH FROM NOW()::timestamp) - EXTRACT(EPOCH FROM lastlogin) < $3) AND admin=TRUE",
                                    [req.session.userid, req.session.id, TTL])
    if (adminRows.rows.length !== 1) {
        res.redirect('/user/' + req.session.userid)
        return
    }

    res.render('user', {
        session: req.session
    })
})

module.exports = router