const Router = require('express-promise-router')
const router = new Router()

const db = require('../db')

router.post('/', async (req, res, next) => {
    if (req.session && req.session.userid) {
        // remove sessionid
        await db.query("UPDATE users SET sessionid=NULL WHERE userid=$1", [req.session.userid])

        req.session.destroy()
    }
    res.redirect('/login')
})

module.exports = router