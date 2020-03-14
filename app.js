const express = require('express');
const mysql = require('mysql');
const bodyparser = require('body-parser');
const session = require('cookie-session');
const fs = require('fs');
let uTimers = {};
let uUsers = []
let oNucl = [];

//create connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'cervical'
});

//connect
db.connect((err) => {
    if (err)
        throw err;
    else
        console.log('Connected to DB');
});

var ses;

const app = express();
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: true}));
app.set('views', __dirname + '/Web');
//app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(session({
    secret: '&*^&#^jdhjshfdu124',
    resave: false,
    saveUninitialized: true
}));
app.get('/', (req, resp) => {
    ses = req.session;
    if (uUsers.indexOf(ses.uID) != -1)
        resp.redirect('/labeling');
    else
        resp.render('login');
});
app.get('/pwdc', (req, resp) => {
    ses = req.session;
    if (uUsers.indexOf(ses.uID) != -1)
        resp.render('pwdchange', {stats: ''});
    else {
        req.session = null;
        resp.redirect('/');
    }
});
app.get('/resetlabel', (req, resp) => {
    ses = req.session;
    if (ses.uID == 'admin') {
        let sql = `UPDATE nucleus SET label = NULL, uID = NULL `;
        db.query(sql, (err, results) => {
            if (err)
                throw err;
        });
    }
    resp.redirect('/labeling');
});
app.get('/logout', (req, resp) => {
    ses = req.session;
    clearTimeout(uTimers[ses.uID]);
    let ind = oNucl.indexOf(ses.nname[ses.nname.length - 1]);
    oNucl.splice(ind, 1);
    console.log(oNucl.join());
    req.session = null;
    resp.redirect('/');
});
app.post('/', (req, resp) => {
    ses = req.session;
    let sql = `SELECT * FROM users WHERE uName = '${req.body.username}' AND pass = '${req.body.pass}'`;
    db.query(sql, (err, results) => {
        if (err)
            throw err;
        else if (results.length != 0) {
            ses.uID = req.body.username;
            uUsers.push(ses.uID);
            ses.stats = 'Initial';
            ses.lst = [];
            ses.ilcount = [];
            ses.nname = [];
            ses.pwdc = '';
            ses.px = [];
            ses.py = [];
            uTimers[ses.uID] = setTimeout(() => {
                console.log("Logout Timer Reached");
            }, 60000);
        }
        resp.redirect('/redirects');
    });
});
app.post('/pwdc', (req, resp) => {
    ses = req.session;
    if (uUsers.indexOf(ses.uID) == -1) {
        req.session = null;
        resp.end('You were logged out due to inactivity');
    } else {
        ses.pwdc = '';
        let sql = `SELECT * FROM users WHERE uName = '${ses.uID}' AND pass = '${req.body.curpass}'`;
        db.query(sql, (err, results) => {
            if (err) {
                throw err;
            } else if (results.length == 0) {
                ses.pwdc = 'Wrong';
                resp.render('pwdchange', {stats: ses.pwdc});
            } else {
                let sql1 = `UPDATE users SET pass = '${req.body.newpass1}' WHERE uName = '${ses.uID}'`;
                db.query(sql1, (err, results) => {
                    if (err) throw err;
                    ses.pwdc = 'Right';
                    resp.render('pwdchange', {stats: ses.pwdc});
                });
            }
        });
    }
});
app.post('/labeling', (req, resp) => {
    ses = req.session;
    if (uUsers.indexOf(ses.uID) == -1) {
        req.session = null;
        resp.end('You were logged out due to inactivity');
    } else {
        var retList = req.body.retObject;
        retList = JSON.parse(retList);
        console.log(retList.prod[0])
        let sql, sql4;
        if (retList.comm.length == 0) {
            if (retList.label != 'skip') {
                sql = `UPDATE nucleus SET lcount = '${retList.ilcount}' WHERE nName = '${retList.nname}'`;
                sql4 = `INSERT INTO labels(nName,uID,label) VALUES('${retList.nname}','${retList.uID}','${retList.label}')`;
            }
        } else {
            if (retList.label != 'skip') {
                sql = `UPDATE nucleus SET lcount = '${retList.ilcount}' WHERE nName = '${retList.nname}'`;
                sql4 = `INSERT INTO labels(nName,uID,label,comment) VALUES('${retList.nname}','${retList.uID}','${retList.label}','${retList.comm}')`;
            }
        }
        if (retList.label != 'skip') {
            db.query(sql, (err, result) => {
                if (err) {
                    ses.stats = 'Error';
                    console.log('Error Updating');
                } else {
                    db.query(sql4, (err, result) => {
                        if (err) {
                            ses.stats = 'Error';
                            console.log('Error Inserting')
                        } else
                            console.log('Inserted');
                    })
                    console.log('Updated');
                }
            });
        }
        ses.lst.pop();
        let tmp = ses.nname.pop();
        let ind = oNucl.indexOf(tmp);
        oNucl.splice(ind, 1);
        ses.ilcount.pop();
        ses.px.pop();
        ses.py.pop();
        ses.stats = 'Success';
        resp.redirect('/labeling');
    }
});
app.get('/redirects', (req, resp) => {
    ses = req.session;
    if (ses.uID)
        resp.redirect('/labeling');
    else
        resp.end('Unsuccessful');
});
app.get('/labeling', (req, resp) => {
    ses = req.session;
    if (uUsers.indexOf(ses.uID) == -1) {
        req.session = null;
        resp.end('You were logged out due to inactivity');
    } else {
        console.log("user is " + ses.uID)
        clearTimeout(uTimers[ses.uID]);
        uTimers[ses.uID] = setTimeout(() => {
            console.log("Logout Timer Reached for " + req.session.uID);
            ses = req.session;
            let ind = oNucl.indexOf(ses.nname[ses.nname.length - 1]);
            oNucl.splice(ind, 1);
            console.log(oNucl.join());
            ind = uUsers.indexOf(ses.uID);
            uUsers.splice(ind, 1);
        }, 60000);
        if (ses.uID && ses.nname.length == 0) {
            let sql1 = `SELECT COUNT(*) A FROM labels where uID = '${ses.uID}'`;
            let lcount = 0;
            db.query(sql1, (err, results) => {
                if (err)
                    throw err;
                lcount = results[0].A;
            });
            let sql = `SELECT * FROM nucleus where lcount < llimit AND nName NOT IN(?) ORDER BY RAND() limit 1`;
            console.log(oNucl.join());
            db.query(sql, oNucl.join(), (err, results) => {
                if (err)
                    throw err;
                let lst;
                let nname;
                let ilcount = 0;
                let img;
                let px, py;
                lst = results[0].fName;
                nname = results[0].nName;
                oNucl.push(nname);
                ilcount = results[0].lcount;
                px = results[0].pX;
                py = results[0].pY;
                console.log(lst + '  ' + px + '  ' + py);
                ses.lst.push(lst);
                ses.nname.push(nname);
                ses.ilcount.push(ilcount);
                ses.px.push(px);
                ses.py.push(py);
                fs.readFile(`./segments/${lst}.jpg`, 'base64', function (err, contents) {
                    if (err) throw err;
                    img = JSON.stringify(contents);
                    console.log(`File Read Successfully => ${contents.length}`);
                    resp.render('labeling', {
                        flist: lst,
                        nName: nname,
                        uName: ses.uID,
                        imge: img,
                        stats: ses.stats,
                        px: px,
                        py: py,
                        lcount: lcount,
                        ilcount: ilcount
                    });
                });
            });
        } else if (ses.uID && ses.nname.length != 0) {
            let sql1 = `SELECT COUNT(*) A FROM labels where uID = '${ses.uID}'`;
            let lcount = 0;
            db.query(sql1, (err, results) => {
                if (err)
                    throw err;
                lcount = results[0].A;
            });
            let lst = ses.lst[ses.lst.length - 1];
            let nname = ses.nname[ses.nname.length - 1];
            let ilcount = ses.ilcount[ses.ilcount.length - 1];
            let px = ses.px[ses.px.length - 1];
            let py = ses.py[ses.py.length - 1];
            let img;
            console.log(lst);
            fs.readFile(`./segments/${lst}.jpg`, 'base64', function (err, contents) {
                if (err) throw err;
                img = JSON.stringify(contents);
                console.log(`File Read Successfully => ${contents.length}`);
                resp.render('labeling', {
                    flist: lst,
                    nName: nname,
                    uName: ses.uID,
                    imge: img,
                    stats: ses.stats,
                    px: px,
                    py: py,
                    lcount: lcount,
                    ilcount: ilcount
                });
            });
        } else
            resp.send('You have to log in first');
    }
});
app.listen('3000', () => {
    console.log('server started on port 3000')
});
