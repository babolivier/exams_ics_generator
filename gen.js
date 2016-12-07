var students    = require('./students.json'),
    fs          = require('fs'),
    ICalParser  = require('cozy-ical').ICalParser,
    VCalendar   = require('cozy-ical').VCalendar,
    request     = require('request');

var promises = [],
    match = {},
    calendars = {};

for(promo in students) {
    promises.push(new Promise(function(sent) {
        match[students[promo][0].login] = promo;
        request
            .get('http://web.isen-bretagne.fr/EDT/' + students[promo][0].login + '.ics')
            .on('response', function(response) {
                var login = response.req.path.match(/\/([^\/\.]+)\.ics/)[1];
                if(response.statusCode === 200) {
                    calendars[match[login]] = '';
                    response.on('data', function(data) {
                        calendars[match[login]] += data.toString();
                    });
                    response.on('end', function() {
                        sent();
                    });
                }
            });
    }));
}

Promise.all(promises).then(function() {
    promises = [];
    var parser = new ICalParser();
    var exams = new VCalendar({
        organization: 'Club Tech',
        title: 'ISEN Exams'
    });
    var tab = [];
    for(c in calendars) {
        promises.push(new Promise(function(added) {
            parser.parseString(calendars[c], function(err, cal) {
                for(sc in cal.subComponents) {
                    if(cal.subComponents[sc].getRawValue('DESCRIPTION').includes('DEVOIRS SURVEILLES')) {
                        exams.add(cal.subComponents[sc]);
                    }
                }
                added();
            });
        }));
    }
    Promise.all(promises).then(function() {
        ics = exams.toString();
        fs.writeFileSync(__dirname + '/exams.ics', ics);
    });
});
