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
    console.log(req.session)
    let rowProjects = await db.query('SELECT * FROM projects LIMIT 3')
    let carouselProjects = await db.query('SELECT * FROM projects LIMIT 3')

    carouselProjects = carouselProjects.rows.map(proj => {
        return {
            image: '../images/carousel1.jpg',
            h1: proj.name,
            p: proj.description,
            button:{caption: "Contribute today", url: "/project/"+proj.projectid}
        }
    })
    rowProjects = rowProjects.rows.map(proj => {
        return {
            heading: proj.name,
            description: proj.description,
            id: proj.projectid
        }
    })

    if (rowProjects.length !== 3 && carouselProjects.length !== 3) {
        console.log('rowprojects and carousel projects must be length 3')
    }
    res.render('carousel', { 
        carouselProjects: carouselProjects, 
        rowProjects : rowProjects,
        session: req.session
    })
})

module.exports = router