module.exports = {
    verify: (req, res, next) => {
        if ((!req.session || !req.session.authenticated)) {
            res.status(403).send('unauthorized')
            return
        }
        next()
    },
    sessionChecker = (req, res, next) => {
        if (req.session.username && req.cookies.user_sid) {
            res.redirect('/dashboard');
        } else {
            next();
        }    
    }
}
