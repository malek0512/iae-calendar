'use strict';

var ical = require('ical-generator'),
    app = require('express')(),
    request = require('request'),
    logger = console,
    cal = ical({
        domain: 'iae-grenoble.fr',
        prodId: '//iae-grenoble.fr//icalendar//EN',
    });

// authenticating
var authenticate = function (credentials, cb) {
    var form = {
        username: credentials.username || "",
        password: credentials.password || "",
        intranet_annee_precedente:"0",
        Connexion:"Connexion"
    }
    request.post({url:'http://intranet.iae-grenoble.fr/index/index', form: form}, cb)    
}

// getting events
var getEvents = function (req, res, cookie) {
    request.get({url:'http://intranet.iae-grenoble.fr/full-calendar/evenements?planningType=0&start=1474236000&end=1487977200',
                headers:{'Cookie':cookie}}, function (err, httpResponse, body) {
        if (err) {
            logger.error('Failed to authenticate : ', err);
            return res.status(400).json({status: 400, result: null, error: "Failed to authenticate"});
        }
        
        try {
            body = JSON.parse(body);
        } catch (e) {
            logger.error('Failed to authenticate');
            return res.status(400).json({status: 400, result: null, error: "Failed to authenticate"});
        }
        
        var events = []
        for(var event in body)
        {
            events.push({
                uid: body[event].id,
                start: body[event].start,
                end: body[event].end,
                summary: body[event].title,
                url: body[event].url
            });
        }
        //logger.log(events);
        cal.events(events);
        cal.serve(res);
    })
}


var port = process.env.PORT || 5000;
app.use(function(req, res) {
    authenticate(req.query || {}, function (err, httpResponse, body) {
        //logger.log(httpResponse.headers['set-cookie']);
        getEvents(req, res, httpResponse.headers['set-cookie'][0]);
    });
});

app.listen(port, function() {
    logger.log('Server running at http://127.0.0.1:'+port);
});