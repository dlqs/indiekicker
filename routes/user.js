const Router = require('express-promise-router')
const router = new Router()

const verify = require('../verify')
const db = require('../db')

router.use(verify)

router.get('/:id', (req, res, next) => {
    res.render('userpage')
})

module.exports = router