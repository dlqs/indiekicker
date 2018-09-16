const router = require('express').Router()

router.get("/", (req, res) => {
    res.render("allprojects", { username: req.session.username })
})

module.exports = router