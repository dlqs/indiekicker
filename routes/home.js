const Router = require('express-promise-router')
const router = new Router()

const db = require('../db')

router.get("/", async (req, res, next) => {

    // Almost-funded projects?
    //const carouselProjects = [
    //    { 
    //        image:"../images/carousel1.jpg",
    //        h1:"Example headline",
    //        p:"hello short description hahahahahaah",
    //        button:{caption:"Contribute today",url:"#"}
    //    } ...
    //const rowProjects = [
    //    {
    //        heading: 'test',
    //        description: 'hello world',
    //        id: 1
    //    } ...

    // select top two sets of top 3 projects to display (MUST BE 3)
    // maybe consider almost funded?

    // projects with at least 90% but not 100% funded ordered by days left
    const daysLeftQuery = 'WITH totalfunding as (SELECT p.*, COALESCE(SUM(f.amount),0) as amountfunded \
                       FROM projects p LEFT JOIN fundings f ON p.projectid = f.projectid GROUP BY p.projectid) \
                       SELECT t.*, (t.amountfunded / t.amountsought * 100.0) as percentagefunded, \
                       DATE_PART(\'days\', t.duedate - now()) as daysleft \
                       FROM totalfunding t ' +
                       'WHERE t.amountfunded < t.amountsought AND now() <= t.duedate AND t.amountfunded/t.amountsought > 0.9' +
                       ' ORDER BY daysleft ASC LIMIT 8'
    let carouselProjects = await db.query(daysLeftQuery)

    const highestFundedQuery = 'WITH totalfunding as (SELECT p.*, COALESCE(SUM(f.amount),0) as amountfunded \
                       FROM projects p LEFT JOIN fundings f ON p.projectid = f.projectid GROUP BY p.projectid) \
                       SELECT t.*, (t.amountfunded / t.amountsought * 100.0) as percentagefunded \
                       FROM totalfunding t ' +
                       'WHERE t.amountfunded >= t.amountsought' +
                       ' ORDER BY t.amountfunded DESC LIMIT 3'
    let rowProjects = await db.query(highestFundedQuery)


    rowProjects = rowProjects.rows.map(proj => {
        return {
            heading: proj.name.substring(0, 30),
            description: proj.description.substring(0, 200) + '...',
            id: proj.projectid,
            amountfunded: proj.amountfunded
        }
    })

    if (rowProjects.length !== 3 && carouselProjects.length !== 3) {
        console.log('rowprojects and carousel projects must be length 3')
    }
    res.render('carousel', { 
        carouselProjects: carouselProjects.rows, 
        rowProjects : rowProjects,
        session: req.session
    })
})

module.exports = router