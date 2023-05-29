const router = require('express').Router();

// For landing page
router.get('/', (req, res) => {
    res.render('home', {
        title: "Express Mongo User Management System Rest Api"
    })
});

module.exports = router;