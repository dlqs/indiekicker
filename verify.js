const verify = (req, res, next) => {
    if ((!req.session || !req.session.authenticated)) {
        res.status(403).send('unauthorized')
        return
    }
    next()
}

module.exports = verify