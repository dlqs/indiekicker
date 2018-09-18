const Router = require('express-promise-router')
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
        console.log('HREEJ')
        const userRows = await db.query("SELECT * FROM users WHERE userid=$1 AND sessionid=$2::bytea AND (EXTRACT(EPOCH FROM NOW()::timestamp) - EXTRACT(EPOCH FROM lastlogin) < $3)",
                                        [req.session.userid, req.session.id, TTL])
        if (userRows.rows.length !== 1) {
            // Either timeout or userid does not match sessionid in table (inconsistent.)
            // set sessionid to NULL
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