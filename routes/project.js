const Router = require('express-promise-router')
const router = new Router()

const db = require('../db')


router.get('/:id', (req, res, next) => {
    res.render('userpage')
})

module.exports = router