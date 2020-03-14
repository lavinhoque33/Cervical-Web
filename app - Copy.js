const express = require('express');
const mysql = require('mysql');
const bodyparser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const clone = require('clone');

//create connection
const db = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'',
    database:'cervical'
});

//connect
db.connect((err)=>{
    if(err)
        throw err;
    else
        console.log('Connected to DB');
});

var ses;

const app = express();
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:true}));
app.set('views', __dirname + '/Web');
//app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(session({
    secret:'&*^&#^jdhjshfdu124',
    resave:false,
    saveUninitialized:true
}));
app.get('/',(req,resp)=>{
    ses = req.session;
    if(ses.uID)
        resp.redirect('/labeling');
    else
        resp.render('login');
});
app.get('/pwdc',(req,resp)=>{
    ses = req.session;
    if(ses.uID)
        resp.render('pwdchange',{stats:''});
    else
        resp.redirect('/');
});
app.get('/resetlabel',(req,resp)=>{
    ses = req.session;
    if(ses.uID == 'admin'){
        let sql = `UPDATE nucleus SET label = NULL, uID = NULL `;
        db.query(sql,(err,results)=>{
            if(err)
                throw err;
        });
    }
    resp.redirect('/labeling');
});
app.get('/logout',(req,resp)=>{
    ses = req.session;
    let sql = `UPDATE nucleus SET proc = NULL WHERE pX = '${ses.px[ses.px.length-1]}' and pY = '${ses.py[ses.py.length-1]}' `;
    db.query(sql,(err,results)=>{
        if(err)
            throw err;
    });
    let sql1 = `UPDATE users SET lstats = 0 WHERE uName = '${ses.uID}'`;
    db.query(sql1,(err,results)=>{
        if(err)
            throw err;
    });
    req.session.destroy();
    resp.redirect('/');
});
app.post('/',(req,resp)=>{
    ses = req.session;
    let sql = `SELECT * FROM users WHERE uName = '${req.body.username}' AND pass = '${req.body.pass}' AND lstats = 0`;
    db.query(sql,(err,results)=>{
       if(err)
           throw err;
       else if(results.length != 0){
           ses.uID = req.body.username;
           ses.stats = 'Initial';
           ses.lst = [];
           ses.pwdc = '';
           ses.px = [];
           ses.py = [];
           let sql1 = `UPDATE users SET lstats = 1 WHERE uName = '${req.body.username}'`;
           db.query(sql1,(err,results)=>{
               if(err)
                   throw err;
           });
       }
       resp.redirect('/redirects');
    });
});
app.post('/pwdc',(req,resp)=>{
    ses = req.session;
    ses.pwdc = '';
    let sql = `SELECT * FROM users WHERE uName = '${ses.uID}' AND pass = '${req.body.curpass}'`;
    db.query(sql,(err,results)=>{
        if(err){
            throw err;
        }
        else if(results.length == 0){
            ses.pwdc = 'Wrong';
            resp.render('pwdchange',{stats:ses.pwdc});
        }
        else{
            let sql1 = `UPDATE users SET pass = '${req.body.newpass1}' WHERE uName = '${ses.uID}'`;
            db.query(sql1,(err,results)=>{
               if(err) throw err;
                ses.pwdc = 'Right';
                resp.render('pwdchange',{stats:ses.pwdc});
            });
        }
    });
});
app.post('/labeling',(req,resp)=>{
    ses = req.session;
    var retList = req.body.retObject;
    retList = JSON.parse(retList);
    console.log(retList.comm.length);
    let sql;
    if(retList.comm.length == 0){
        if(retList.label!='skip')
            sql = `UPDATE nucleus SET uID = '${retList.uID}',label = '${retList.label}',proc = NULL WHERE pX = '${retList.px}' and pY = '${retList.py}' and fName = '${retList.fName}'`;
        else
            sql = `UPDATE nucleus SET sName = '${retList.uID}',sStatus = 1,proc = NULL WHERE pX = '${retList.px}' and pY = '${retList.py}' and fName = '${retList.fName}'`;
    }
    else{
        if(retList.label!='skip')
            sql = `UPDATE nucleus SET uID = '${retList.uID}',label = '${retList.label}',comment = '${retList.comm}',proc = NULL WHERE pX = '${retList.px}' and pY = '${retList.py}' and fName = '${retList.fName}'`;
        else
            sql = `UPDATE nucleus SET sName = '${retList.uID}',sStatus = 1,comment = '${retList.comm}',proc = NULL WHERE pX = '${retList.px}' and pY = '${retList.py}' and fName = '${retList.fName}'`;
    }

    db.query(sql, (err,result)=>{
        if(err){
            ses.stats = 'Error';
            console.log('Error Updating');
        }
        else{
            console.log(result);
            ses.lst.pop();
            ses.px.pop();
            ses.py.pop();
            ses.stats = 'Success';
        }
        resp.redirect('/labeling');
    });
});
app.get('/redirects',(req,resp)=>{
    ses = req.session;
    if(ses.uID)
        resp.redirect('/labeling');
    else
        resp.end('Unsuccessful');
});
app.get('/labeling',(req,resp)=>{
    ses = req.session;
    if(ses.uID && ses.lst.length==0){
        let sql1 = `SELECT COUNT(*) A FROM nucleus where uID = '${ses.uID}'`;
        let sql2 = `SELECT COUNT(*) B FROM nucleus where sName = '${ses.uID}'`;
        let lcount=0;
        let scount=0;
        db.query(sql1,(err,results)=>{
            if(err)
                throw err;
            lcount = results[0].A;
            console.log(ses.uID + " Here "+ lcount);
        });
        db.query(sql2,(err,results)=>{
            if(err)
                throw err;
            scount = results[0].B;
        });
        let sql = `SELECT * FROM nucleus where label IS NULL AND proc IS NULL AND (sStatus = 0 OR (sStatus = 1 AND sName <> '${ses.uID}')) limit 1`;
        db.query(sql,(err,results)=>{
            if(err)
                throw err;
            let lst;
            let img;
            let px,py;
            lst = results[0].fName;
            px = results[0].pX;
            py = results[0].pY;
            console.log(lst+'  '+px+'  '+py);
            let sql1 = `UPDATE nucleus SET proc = 1 WHERE pX = '${px}' and pY = '${py}' `;
            db.query(sql1);
            ses.lst.push(lst);
            ses.px.push(px);
            ses.py.push(py);
            fs.readFile(`./segments/${lst}.jpg`,'base64', function(err, contents) {
                if(err) throw err;
                img = JSON.stringify(contents);
                console.log(`File Read Successfully => ${contents.length}`);
                resp.render('labeling',{flist:lst,uName:ses.uID,imge:img,stats:ses.stats,px:px,py:py,lcount:lcount,scount:scount});
            });
        });
    }
    else if(ses.uID && ses.px.length!=0){
        let sql1 = `SELECT COUNT(*) A FROM nucleus where uID = '${ses.uID}'`;
        let sql2 = `SELECT COUNT(*) B FROM nucleus where sName = '${ses.uID}'`;
        let lcount=0;
        let scount=0;
        db.query(sql1,(err,results)=>{
            if(err)
                throw err;
            lcount = results[0].A;
            console.log(ses.uID + " Here "+ lcount);
        });
        db.query(sql2,(err,results)=>{
            if(err)
                throw err;
            scount = results[0].B;
        });
        let lst = ses.lst[ses.lst.length-1];
        let px = ses.px[ses.px.length-1];
        let py = ses.py[ses.py.length-1];
        let img;
        console.log(lst);
        fs.readFile(`./segments/${lst}.jpg`,'base64', function(err, contents) {
            if(err) throw err;
            img = JSON.stringify(contents);
            console.log(`File Read Successfully => ${contents.length}`);
            resp.render('labeling',{flist:lst,uName:ses.uID,imge:img,stats:ses.stats,px:px,py:py,lcount:lcount,scount:scount});
        });
    }
    else
        resp.send('You have to log in first');
});
app.listen('3000',()=>{
    console.log('server started on port 3000')
});
