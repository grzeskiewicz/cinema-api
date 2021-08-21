const bcrypt = require('bcrypt');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const express = require('express');
const nodemailer = require('nodemailer');
const app = express();
const cors = require('cors');
app.use(cors());
const dbConfig = require('../dbConfig');
const mailConfig = require('../mailConfig');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies 
app.use(express.json());
const transporter = nodemailer.createTransport(mailConfig.config);



const comparePassword = function (password, hash) {
    return bcrypt.compareSync(password, hash);
}

let connection;

function handleDisconnect() {
    connection = mysql.createConnection(dbConfig.config); // Recreate the connection, since
    // the old one cannot be reused.

    connection.connect(function (err) {              // The server is either down
        if (err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    connection.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect();

const register = function (req, res) {
    let userExists;
    let vals = Object.keys(req.body).map((key) => `"${req.body[key]}"`);


    connection.query(`select 1 from customers where email='${req.body.email}'`, function (err, rows) {
        if (err) res.json(err);
        userExists = rows[0];
    });

    if (userExists) {
        res.json({ success: false, msg: "User exists already" });
    } else {
        vals[1] = `"${bcrypt.hashSync(req.body.password, 10)}"`;
        connection.query("INSERT INTO customers(email,password,name,surname,telephone) VALUES(" + vals.join(",") + ")", function (err, result) {
            if (err) {
                if (err.code === "23505") { //23505 code for key existing already
                    res.json({ success: false, msg: "User exists already!" });
                }
            } else {
                sendEmailRegistered(req.body.email, req.body.name);
                res.json({ success: true, msg: "Registration successful!" });
            }
        });
    }

}

const sendEmailRegistered = (email, name) => {

    htmlTemplate = `
    <html>
    <head>
      <meta charset="utf-8">
      <link rel="stylesheet" type="text/css" href="email.css">
    </head>
    <body>
    <div>
    <h2>Hello ${name}!</h2>
    <h3>You have successfully registered an account in our cinema!</h3>
    <p>From now on you will be able to order tickets!</p>
        <div id="register">
        <p style="color:red;font-weight:normal;">Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod 
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
        quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum 
        dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, 
        sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    </div> <hr>   
    <div id="footer" style="display:block">
    <p style="color:green;margin:0 auto;">FOOTER CINEMA'S DATA</p>
    <p style="margin:0 auto;">LOGO</p>
    </div> 
    </body>
  </html>`;

    const mailOptions = {
        //from: 'cinemanode@gmail.com',
        from: 'cinemanode.api@gmail.com',
        to: email,
        subject: 'Tickets Cinemanode',
        html: htmlTemplate
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}



const customers = function (req, res) {
    connection.query("select * from customers", function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}

const deletecustomer = function (req, res) {
    const customer = req.body;

    connection.query("delete from customers where id=" + customer.customerid, function (err, rows) {
        if (err) res.json(err);
        res.json(rows);

    });
}



const login = function (req, res) {
    connection.query("select * from customers where email='" + req.body.email + "'", function (err, rows) {
        if (err) res.json(err);
        user = rows[0];
        if (user) {
            if (!comparePassword(req.body.password, user.password)) {
                //res.status(401).json({success:false, msg: 'Authentication failed. Wrong password.' });
                res.json({ success: false, msg: "Authentication failed. Wrong password" });
            } else {
                return res.json({ success: true, msg: "Loging in success!", token: 'JWT ' + jwt.sign({ email: user.email, name: user.name, surname: user.surname, id: user.id }, 'RESTFULAPIs') });
            }
        } else {
            // res.status(401).json({ msg: 'Authentication failed. User not found.' });
            res.json({ success: false, msg: " Authentication failed. User not found" });
        }

    });
};


const memberinfo = function (req, res, next) {
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'JWT') {
        jwt.verify(req.headers.authorization.split(' ')[1], 'RESTFULAPIs', function (err, decode) {
            if (err) req.user = undefined;
            if (decode === undefined) {
                res.json({ success: false, msg: "No token" });
            }
            connection.query("select id,email from customers where email='" + decode.email + "'", function (err, rows) {
                const user = rows[0];
                if (user) {
                    res.json({ success: true, msg: { username: decode.email, id: decode.id } });
                } else {
                    res.json({ success: false, msg: "No such user registered" });
                }

            });
            req.user = decode; //?
            // next();
        });
    } else {
        res.json({ success: false, msg: "Token not provided" });
        req.user = undefined; //?

        //next();
    }

};


const loginRequired = function (req, res, next) {
    if (req.user) {
        console.log("loginRequired");
        next();
    } else {
        return res.status(401).json({ message: 'Unauthorized user!' });
    }
};

module.exports = { register, login, loginRequired, memberinfo, customers, deletecustomer }