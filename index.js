'use strict';

var ical = require('ical-generator'),
    express = require('express'),
    app = express(),
    request = require('request'),
    moment = require('moment-timezone'),
    logger = console,
    cal = ical({
        domain: 'iae-grenoble.fr',
        prodId: '//iae-grenoble.fr//icalendar//EN',
    });

var base_url = "http://intranet.iae-grenoble.fr";
var timezone = "Europe/Paris";

// authenticating
var authenticate = function (credentials, cb) {
    var form = {
        username: credentials.u || "",
        password: credentials.p || "",
        intranet_annee_precedente:"0",
        Connexion:"Connexion"
    }
    request.post({url: base_url + '/index/index', form: form}, cb)    
}

// getting events
var getEvents = function (req, res, cookie) {

    var params = req.query;
    delete params.u;
    delete params.p;
    params.planningType = params.planningType || "0";
    params.start = (Date.parse(params.start) || Date.parse("2016-09-01")) / 1000; //"1474236000"
    params.end = (Date.parse(params.end) || Date.parse("2017-06-01")) / 1000; //"1487977200"

    request.get({url: base_url + '/full-calendar/evenements', //?planningType=0&start=1474236000&end=1487977200
                headers:{'Cookie':cookie}, qs: params}, function (err, httpResponse, body) {
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
            var desc = body[event].url ? (base_url + body[event].url) : "";
            desc += " (Exported: " + moment.tz(Date.now(), timezone).format() + ")";

            events.push({
                uid: body[event].id.toString(),
                start: moment.tz(body[event].start, timezone).format(),
                end: moment.tz(body[event].end, timezone).format(),
                summary: body[event].title,
                url: base_url + body[event].url,
                description: desc
            });
        }
        
        cal.events(events);
        //logger.log(events[0]);
        //logger.log(cal.events()[0].start());
        cal.serve(res);
    })
}


app.use(function(req, res, next) {
    if (req.query.hasOwnProperty('u') && req.query.hasOwnProperty('p'))
        authenticate(req.query || {}, function (err, httpResponse, body) {
            //logger.log(httpResponse.headers['set-cookie']);
            getEvents(req, res, httpResponse.headers['set-cookie'][0]);
        });
    else 
        next();
});

app.use(express.static('public'));
app.get('/', function (req, res) {
    res.sendFile('index.html');
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
    logger.log('Server running at http://127.0.0.1:' + port);
});