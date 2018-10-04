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
        let { rows } = await db.query(query)
        res.render('projects', { session: req.session, projects: rows })
    } else {
        let { rows } = 
            await db.query('WITH totalfunding as (SELECT p.*, COALESCE(SUM(f.amount),0) as amountfunded \
                            FROM projects p LEFT JOIN fundings f ON p.projectid = f.projectid GROUP BY p.projectid) \
                            SELECT t.*, (t.amountfunded / t.amountsought * 100.0) as percentagefunded \
                            FROM totalfunding t ORDER BY t.name')
        rows = rows.map(proj => {
            return {
                'imageid': proj.projectid % 3 + 1,
                ...proj
            }
        })
        res.render('projects', { session: req.session, projects: rows })
    }

})

router.get('/create', async (req, res, next) => {
    res.render('createproject', { session: req.session })
})

router.post('/all/:page', async (req, res, next) => {
    // default is name, asc, all, all
    req.session.projectfilters = req.body
    res.redirect('/project/all/1')
})

router.post('/:id/fund', async (req, res, next) => {
    // default is name, asc, all, all
})

router.get('/:id', async (req, res, next) => {
    let { rows } = await db.query('WITH totalfunding as (SELECT p.*, COALESCE(SUM(f.amount),0) as amountfunded \
                            FROM projects p LEFT JOIN fundings f ON p.projectid = f.projectid GROUP BY p.projectid) \
                            SELECT t.*, (t.amountfunded / t.amountsought * 100.0) as percentagefunded \
                            FROM totalfunding t WHERE t.projectid=$1', [req.params.id])
    let fundedRows = await db.query('SELECT * FROM fundings f WHERE f.userid=$1 and f.projectid=$2', [req.session.userid, req.params.id])
    const fundings = {
        funded: false
    }
    if (fundedRows.rows.length == 1) {
        fundings.funded = true
        fundings.amount = fundedRows.rows[0].amount
    }
    if (rows.length == 1) {
        res.render('project', { session: req.session, project: rows[0], fundings: fundings})
    } else {
        res.status(404).send('Project not found')
    }
})

router.post('/search', async (req, res, next) => {
    // default is name, asc, all, all
    req.session.searchparams = req.body.searchparams.trim().split(/\s+/)
    res.redirect('/project/search/1')
})


module.exports = router