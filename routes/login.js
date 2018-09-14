const Router = require('express-promise-router')
const router = new Router()

const db = require('../db')

router.get('/', (req, res, next) => {
    res.render('login')
})

router.post('/', async (req, res, next) => {
    if (req.body.username && req.body.password) {
        const { rows } = await db.query("SELECT * FROM users WHERE username=$1 AND password=$2", 
                                        [req.body.username, req.body.password])
        if (rows.length === 1) {
            req.session.authenticated = true
            // populate session data
            req.session.username = rows[0].username
            req.session.email = rows[0].email
            req.session.role = rows[0].role
            req.session.last_login = rows[0].last_login
            console.log(rows)
            res.redirect('/user/' + rows[0].user_id)
        } else {

        }
    }
})

module.exports = router