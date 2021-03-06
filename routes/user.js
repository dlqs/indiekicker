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

    const { rows } = await db.query('SELECT * FROM users ORDER BY userid ASC;')

    const users = []
    res.render('users', {
        session: req.session,
        users: rows
    })
})

// normal users go through this route.
router.use('/:id', isTheUser)

// delete only if users has not made any fundings or started any projects
router.post('/:id/delete', async (req, res, next) => {
    let errors = []
    // check fundings
    const fundedRows = await db.query('SELECT * from fundings f WHERE f.userid=$1', [req.params.id])
    const projectRows = await db.query('SELECT * FROM projects p WHERE p.owner=$1', [req.params.id])

    if (fundedRows.rows.length > 0) {
        errors.push('<strong>Error:</strong> you have already funded a project')
    }
    if (projectRows.rows.length > 0) {
        errors.push('<strong>Error:</strong> you have already started a project')
    }

    // send back if errors
    if (errors.length !== 0) {
        req.session.error = errors
        res.redirect('back')
        return
    }
    await db.query('DELETE FROM users WHERE userid=$1', [req.params.id])
    res.redirect('/login?delete=true')
})

router.get('/:id', async (req, res, next) => {
    const userRows = await db.query('SELECT * FROM USERS u WHERE u.userid=$1', [req.params.id])
    const projectRows = await db.query('SELECT * FROM projects p WHERE p.owner=$1', [req.params.id])
    const fundedRows = await db.query('SELECT p.name, f.amount, p.projectid from fundings f, projects p WHERE f.projectid=p.projectid AND f.userid=$1', [req.params.id])
    const fundedAmountRows = await db.query('SELECT SUM(f.amount) as funded FROM fundings f WHERE f.userid=$1', [req.params.id])
    const fundingGatheredRows = await db.query('SELECT SUM(f.amount) as funding FROM fundings f, projects p WHERE p.owner=$1 AND f.projectid=p.projectid', [req.params.id])
    const oldNotificationRows = await db.query('SELECT * FROM notifications n WHERE n.userid=$1 AND n.seen=TRUE ORDER BY n.createdat DESC LIMIT 10', [req.params.id])
    const newNotificationRows = await db.query('SELECT * FROM notifications n WHERE n.userid=$1 AND n.seen=FALSE ORDER BY n.createdat DESC LIMIT 10', [req.params.id])
    const projects = projectRows.rows
    const oldNotif = oldNotificationRows.rows
    const newNotif = newNotificationRows.rows

    // if rendered, mark as seen
    for (let notif of newNotif) {
        await db.query('UPDATE notifications SET seen=TRUE WHERE notificationid=$1', [notif.notificationid])
    }

    const user = {
        userid: userRows.rows[0].userid,
        username: userRows.rows[0].username,
        name: userRows.rows[0].name,
        email: userRows.rows[0].email,
    }

    err = req.session.error
    succ = req.session.success
    // necessary to delete
    delete req.session.error
    delete req.session.success
    res.render('user', {
        session: req.session,
        user: user,
        projects: projects,
        oldNotif: oldNotif,
        newNotif: newNotif,
        funded: fundedRows.rows,
        fundedAmount: fundedAmountRows.rows[0].funded === null ? 0: fundedAmountRows.rows[0].funded,
        fundingGathered: fundingGatheredRows.rows[0].funding === null ? 0: fundingGatheredRows.rows[0].funding,
        error: err,
        success: succ
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
            req.session.error = errors
            res.redirect('back')
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
        res.redirect('back')
        return
})

module.exports = router