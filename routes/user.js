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

// only admins go through this route.
router.get('/all', async (req, res, next) => {
    const adminRows = await db.query("SELECT * FROM users WHERE userid=$1 AND sessionid=$2::bytea AND (EXTRACT(EPOCH FROM NOW()::timestamp) - EXTRACT(EPOCH FROM lastlogin) < $3) AND admin=TRUE",
                                    [req.session.userid, req.session.id, TTL])
    if (adminRows.rows.length !== 1) {
        res.redirect('/user/' + req.session.userid)
        return
    }

    res.render('allusers', {
        session: req.session
    })
})

// normal users go through this route.
router.use('/:id', isTheUser)

router.get('/:id', async (req, res, next) => {
    const userRows = await db.query('SELECT * FROM USERS u WHERE u.userid=$1', [req.params.id])
    const projectRows = await db.query('SELECT * FROM projects p WHERE p.owner=$1', [req.params.id])
    const fundedRows = await db.query('SELECT p.name, f.amount, p.projectid from fundings f, projects p WHERE f.projectid=p.projectid AND f.userid=$1', [req.params.id])
    const projects = projectRows.rows
    const funded = fundedRows.rows
    const user = {
        username: userRows.rows[0].username,
        name: userRows.rows[0].name,
        email: userRows.rows[0].email,
    }
    res.render('user', {
        session: req.session,
        user: user,
        projects: projects,
        funded: funded
    })
})

router.post('/:id', [
    ], async (req, res, next) => {
        let errors = []
        // express validator cannot compare with other fields in same body
        if (req.body.username) {
            req.checkBody('username').isAlphanumeric().isLength({ min: 6 })
            const usernameResult = await db.query('SELECT * from users WHERE username=$1', [req.body.username])
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
            const emailResult = await db.query('SELECT * from users WHERE email=$1', [req.body.email])
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
                await db.query('UPDATE users SET name=$1 WHERE userid=$2', [req.body.name, req.params.id])
                if (req.session.userid === parseInt(req.params.id)) {
                    req.session.name = req.body.name
                }
            }
            if (req.body.username) {
                await db.query('UPDATE users SET username=$1 WHERE userid=$2', [req.body.username, req.params.id])
                if (req.session.userid === parseInt(req.params.id)) {
                    req.session.username = req.body.username
                }
            }
            if (req.body.password) {
                await db.query('UPDATE users SET passworddigest=md5($1)::uuid WHERE userid=$2', [req.body.password, req.params.id])
            }
            if (req.body.email) {
                await db.query('UPDATE users SET email=$1 WHERE userid=$2', [req.body.email, req.params.id])
                if (req.session.userid === parseInt(req.params.id)) {
                    req.session.email = req.body.email
                }
            }
        } catch (error) {
            console.log(error)
            return
        }
        const userRows = await db.query('SELECT * FROM USERS u where u.userid=$1', [req.params.id])
        const projectRows = await db.query('SELECT * FROM projects p where p.owner=$1', [req.params.id])
        const projects = projectRows.rows
        const user = {
            username: userRows.rows[0].username,
            name: userRows.rows[0].name,
            email: userRows.rows[0].email,
        }
        res.render('user', 
        { 
            session: req.session, 
            success: ['Updated successfully.'],
            user: user,
            projects: projects

        })
        return
})



module.exports = router