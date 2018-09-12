const Router = require('express-promise-router')
const router = new Router()

const db = require('../db')

router.get('/login', (req, res, next) => {
    res.render('login')
})

router.post('/login', async (req, res, next) => {
    if (req.body.username && req.body.password) {
        const { rows } = await db.query("SELECT * FROM users WHERE username=$1 AND password=$2", 
                                        [req.body.username, req.body.password])
        if (rows.length === 1) {
            req.session.authenticated = true
            res.redirect('/secure')
        }
    }
})

module.exports = router