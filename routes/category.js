const Router = require('express-promise-router')
const router = new Router()

const db = require('../db')

const arrayWrapper = (obj) => {
    if (Array.isArray(obj)) {
        return obj
    } else if (obj === undefined || obj === null) {
        return []
    } else {
        return [obj]
    }
}

const datePassed = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) //time insensitive compare
    return today > date
}

router.get('/all/:id', async (req, res, next) => {
    let { rows } = await db.query("SELECT p.category, COUNT(*) FROM projects p GROUP BY p.category ORDER BY COUNT(*) DESC")
    rows = rows.map(row => {
        if (row.category === null) {
            return {
                ...row,
                category: "uncategorized"
            }
        }
        return row
    })
    res.render('categories', {
        session: req.session,
        categories: rows
    })
})

router.get('/:category', async (req, res, next) => {
    const { rows } = await db.query("SELECT * from projects p where p.category=$1", [req.params.category])
    res.render('category', {
        session: req.session,
        projects: rows
    })
})

module.exports = router