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

router.get('/all/:page', async (req, res, next) => {
    let queries = arrayWrapper(req.query.q)
    let status = req.query.status === undefined ? null : req.query.status
    let duedate = req.query.duedate === undefined ? null : req.query.duedate

    const wcond = []
    if (status !== null) {
        if (status === 'funded') {
            wcond.push('t.amountfunded >= t.amountsought')
        } else {
            wcond.push('t.amountfunded < t.amountsought')
        }
    }
    if (duedate !== null) {
        if (duedate === 'passed') {
            wcond.push('now() > t.duedate')
        } else {
            wcond.push('now() <= t.duedate')
        }
    }
    const where = wcond.length !== 0 ? (wcond.length === 1 ? wcond[0] : wcond.join(' AND ')) : 'TRUE'
    let query 

    if (queries.length > 0) {
        // custom order
        let orderby = req.query.orderby === undefined ? 'matches': req.query.orderby
        let order = req.query.order === undefined ? 'DESC': req.query.order
        // delete
        await db.query('DELETE FROM queries q WHERE q.userid=$1', [req.session.userid])
        //insert
        for (let param of queries) {
            await db.query('INSERT INTO queries VALUES ($1, $2)', [req.session.userid, param])
        }
        query = 'WITH totalfunding as (SELECT p.*, COALESCE(SUM(f.amount),0) as amountfunded \
                 FROM projects p LEFT JOIN fundings f ON p.projectid = f.projectid GROUP BY p.projectid) \
                 SELECT t.*, (t.amountfunded / t.amountsought * 100.0) AS percentagefunded, COUNT(*) AS matches \
                 FROM totalfunding t, queries q, keywords k \
                 WHERE q.userid='+req.session.userid+' AND t.projectid=k.projectid AND k.keyword::citext=q.keyword \
                 GROUP BY t.projectid, t.owner, t.name, t.description, t.amountsought, t.startdate, t.duedate, t.category, t.amountfunded \
                 HAVING ' + where +
                 ' ORDER BY ' + orderby + ' ' + order
    } else {
        let orderby = req.query.orderby === undefined ? 'name': req.query.orderby
        let order = req.query.order === undefined ? 'ASC': req.query.order

        query = 'WITH totalfunding as (SELECT p.*, COALESCE(SUM(f.amount),0) as amountfunded \
                       FROM projects p LEFT JOIN fundings f ON p.projectid = f.projectid GROUP BY p.projectid) \
                       SELECT t.*, (t.amountfunded / t.amountsought * 100.0) as percentagefunded \
                       FROM totalfunding t ' +
                       'WHERE ' + where +
                       ' ORDER BY ' + orderby + ' ' + order
    }
    let result = await db.query(query)
    // images
    let rows = result.rows
    rows = rows.map(proj => {
        return {
            'imageid': proj.projectid % 3 + 1,
            ...proj
        }
    })
    res.render('projects', { 
        session: req.session, 
        projects: rows,
        queries: req.query,
        queryparams: queries
    })
})

router.get('/create', async (req, res, next) => {
    let error = arrayWrapper(req.query.error)
    let success = arrayWrapper(req.query.success)
    error = error.map(err => {
        if (err === 'amountsought') {
            return '<strong>Error:</strong> Amount sought must be positive'
        } else if (err === 'duedate') {
            return '<strong>Error:</strong> Due date must be after today'
        } else {
            return '<strong>Error:</strong>'
        }
    })
    success = success.map(succ => {
        if (succ === 'created') {
            return '<strong>Success!</strong> You have started a project.'
        } else if (succ === 'updated') {
            return '<strong>Success!</strong> You have updated your funding amount.'
        }
    })
    let { rows } = await db.query('SELECT distinct p.category from projects p;')
    rows = rows.map(row => {
        if (row.category === null) {
            return 'others'
        } else {
            return row.category
        }
    })
    res.render('createproject', { 
        session: req.session, 
        categories: rows, 
        error: error, 
        success: success
    })
})

router.post('/create', async (req, res, next) => {
    let errors = []
    amountsought = parseInt(req.body.amountsought)
    if (amountsought <= 0) {
        errors.push('amountsought')
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0) //time insensitive compare
    if (new Date(req.body.duedate) < today) {
        errors.push('duedate')
    }

    errors = errors.map(err => 'error=' + err).join('&')
    if (errors) {
        res.redirect('/project/create?' + errors)
    } else {
        await db.query('INSERT INTO projects VALUES (default, $1, $2, $3, $4, now(), $5, $6)', 
            [req.session.userid, req.body.name, req.body.description, amountsought, req.body.duedate, req.body.category])
        res.redirect('/project/create?success=created')
    }
})

router.post('/all/:page', async (req, res, next) => {
    // translate body to params
    let urlqueries = arrayWrapper(req.query.q)
    let query = ''
    for (let key in req.body) {
        query += `${key}=${req.body[key]}&`
    }
    urlqueries.forEach(param => {
        query += `q=${param}&`
    })
    res.redirect('/project/all/1?' + query)
})

router.post('/:id/fund', async (req, res, next) => {
    // check if user already funded if so update, else insert
    let { rows } = await db.query('WITH totalfunding as (SELECT p.*, COALESCE(SUM(f.amount),0) as amountfunded \
                            FROM projects p LEFT JOIN fundings f ON p.projectid = f.projectid GROUP BY p.projectid) \
                            SELECT t.*, (t.amountfunded / t.amountsought * 100.0) as percentagefunded \
                            FROM totalfunding t WHERE t.projectid=$1', [req.params.id])
    let fundedRows = await db.query('SELECT * FROM fundings f WHERE f.userid=$1 and f.projectid=$2', [req.session.userid, req.params.id])

    if (fundedRows.rows.length === 1) {
        //funded
        if (parseInt(req.body.amount) <= parseInt(fundedRows.rows[0].amount)) {
            req.session.error = ['<strong>Error:</strong> New funding amount must be more!']
        }
    } else {
        // not funded
        if (parseInt(req.body.amount) + parseInt(rows[0].amountfunded) <= parseInt(rows[0].amountsought)) {
            try {
                const result = await db.query('INSERT INTO fundings VALUES ($1, $2, now(), $3)', [req.session.userid, req.params.id, req.body.amount])
            } catch (error){
                console.log(error)
                req.session.error = ['<strong>Error:</strong> DB error']
            }
            req.session.success = ['<strong>Success</strong> Thanks for supporting!']
        } else {
            // exceeds
            req.session.error = ['<strong>Error:</strong> Funding amount exceeds maximum!']
        }
    }

    res.redirect('/project/' + req.params.id)
})

router.get('/:id', async (req, res, next) => {
    let { rows } = await db.query('WITH totalfunding as (SELECT p.*, COALESCE(SUM(f.amount),0) as amountfunded \
                            FROM projects p LEFT JOIN fundings f ON p.projectid = f.projectid GROUP BY p.projectid) \
                            SELECT t.*, (t.amountfunded / t.amountsought * 100.0) as percentagefunded \
                            FROM totalfunding t WHERE t.projectid=$1', [req.params.id])
    let fundedRows = await db.query('SELECT * FROM fundings f WHERE f.userid=$1 and f.projectid=$2', [req.session.userid, req.params.id])
    let keywordRows = await db.query('SELECT * FROM keywords k WHERE k.projectid=$1', [req.params.id])
    let contributorRows = await db.query('SELECT * FROM projects p, fundings f, users u WHERE p.projectid=f.projectid AND u.userid=f.userid AND p.projectid=$1', [req.params.id])
    let ownerRows = await db.query('SELECT * FROM projects p, users u WHERE p.owner=u.userid AND p.projectid=$1', [req.params.id])
    const contributors = contributorRows.rows
    const keywords = keywordRows.rows.map(row => row.keyword)
    const fundings = {
        funded: false
    }
    const passed = datePassed(rows[0].duedate)
    if (fundedRows.rows.length === 1) {
        fundings.funded = true
        fundings.amount = fundedRows.rows[0].amount
    }
    const fullyfunded = rows[0].percentagefunded >= 100
    if (rows.length === 1) {
        err = req.session.error
        succ = req.session.success
        // necessary to delete
        delete req.session.error
        delete req.session.success
        res.render('project', { 
                session: req.session, 
                project: rows[0], 
                fundings: fundings, 
                error: err, 
                success: succ, 
                passed: passed,
                fullyfunded:fullyfunded,
                keywords:keywords,
                contributors: contributors,
                ownerName: ownerRows.rows[0].name
            })
    } else {
        res.status(404).send('Project not found')
    }
})

router.post('/search', async (req, res, next) => {
    const searchparams = req.body.searchparams.trim().split(/\s+/)
    let query = ''
    searchparams.forEach(param => {
        query += `q=${param}&`
    })
    res.redirect('/project/all/1?'+query)
})



module.exports = router