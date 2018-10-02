const Router = require('express-promise-router')
const router = new Router()

const db = require('../db')

router.get('/all/:page', async (req, res, next) => {
    // name, description, projectid, imageid
    if ('projectfilters' in req.session) {
        const wcond = ['now() > p.duedate', 'p.amountfunded >= p.amountsought']
        if ('orderby' in req.session.projectfilters) {
            if (req.session.projectfilters.orderby === 'name') {

            } else if (req.session.projectfilters.orderby === 'fundingamt') {

            } else if (req.session.projectfilters.orderby === 'targetamt') {

            } else {
                console.error('Unrecognized filter')
            }
        } else {
            //default orderby name
        }
        if ('order' in req.session.projectfilters) {
            

        } else {
            //default order is ASC
        }
        if ('funded' in req.session.projectfilters) {

        } else {
            //default show both funded and not
        }
        if ('duepassed' in req.session.projectfilters) {
            
        } else {
            //default show both duepassed and not
        }
        const where = wcond !== [] ? (wcond.length === 1 ? wcond[0] : wcond.join(' AND ')) : 'TRUE'
        const orderby = 'p.name'
        const order = 'ASC'
        const query = 'SELECT p.*, (SELECT SUM(amount) FROM fundings f WHERE f.projectid = p.projectid) as amountfunded, \
                       amountfunded / amountsought * 100.0 as percentagefunded \
                       FROM projects p ' +
                       'WHERE ' + where +
                       ' ORDER BY ' + orderby + ' ' + order
        console.log(query)
        let { rows } = await db.query(query)
        res.render('projects', { session: req.session, projects: rows })
    } else {
        let { rows } = await db.query('SELECT p.* FROM projects p;')
        rows = rows.map(proj => {
            return {
                'imageid': 2,
                ...proj
            }
        })
        res.render('projects', { session: req.session, projects: rows })
    }

})

router.post('/all/:page', async (req, res, next) => {
    // default is name, asc, all, all
    req.session.projectfilters = req.body
    res.redirect('/project/all/1')
})

router.get('/:id', async (req, res, next) => {

})

module.exports = router