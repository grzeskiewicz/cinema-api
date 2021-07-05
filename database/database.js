const mysql = require('mysql')
const async = require("async");
const moment = require('moment');
const express = require('express');
const date = require('../date/date');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const dbConfig = require('../dbConfig');
const mailConfig = require('../mailConfig');
const app = express();
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies 
app.use(express.json());



const transporter = nodemailer.createTransport(mailConfig.config);
/*============================================*/
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



const showings = function (req, res) {
    connection.query("select s.id,f.title,f.director,f.genre,f.length,f.category,f.imageUrl,p.normal, p.discount,r.id as room,r.seats,date from showings s, prices p, rooms r, films f where s.film=f.id AND s.room=r.id AND s.price=p.id ", function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}


const showingsbydate = function (req, res) {
    connection.query('select s.id,f.title,f.director,f.genre,f.length,f.category,f.imageUrl,p.normal, p.discount,r.id as room,r.seats,date from showings s, prices p, rooms r, films f where s.film=f.id AND s.room=r.id AND s.price=p.id AND date::text LIKE ' + "'" + req.params.date + "%'", function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });

}


const seatsshowing = function (req, res) {
    connection.query("select r.seats from showings s, rooms r where r.id=s.room AND s.id='" + req.params.showingid + "'", function (err, rows) {
        if (err) res.json(err);
        res.json(rows[0]);
    });

}


const seatstaken = function (req, res) {
    //console.log(JSON.stringify(req.params.showingid));
    connection.query("select seat from tickets where showing='" + req.params.showingid + "'", function (err, rows) {
        if (err) res.json(err);
        const arr = [];
        for (const i in rows) {
            arr.push(rows[i].seat);
        }
        res.json(arr);
    });

}





const sendEmail = (tickets) => {
    console.log(tickets);
    htmlTemplate = `
    <html>
    <head>
      <meta charset="utf-8">
      <link rel="stylesheet" type="text/css" href="email.css">
    </head>
    <body>
    <div>
    <h2>Hello!</h2>
    <h3>You have successfully ordered tickets for the show:</h3>
        <div id="ticket">
        <p>${tickets.showingDesc.title} Date:${tickets.showingDesc.fullDate} ${tickets.showingDesc.date}</p>
        <p style="font-weight:bold;">Seats: ${tickets.seats}</p>
        <hr><p>Tickets are attached in the email!</p>
        <div>
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
        from: 'cinemanode.api@gmail.com',
        to: tickets.email,
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



const newticket = function (req, res) {
    sendEmail(req.body);
    const showingDesc = req.body.showingDesc;
    delete req.body.showingDesc;
    const vals = Object.keys(req.body).map(function (key) { // DO I NEED IT??
        return req.body[key];
    });
    vals.splice(1, 1);
    vals.forEach(function (params) {
        if (params === undefined || params === '' || params === null) {
            res.json({ success: false, msg: "Missing parameters" });
        }
    });
    const seats = req.body.seats;
    async.forEachOf(seats, function (seat) {
        //2018-05-02T09:28:00.000Z
        connection.query(`INSERT INTO tickets(showing,seat,price,email,status,purchasedate) VALUES('${req.body.showing}','${seat}','${req.body.price}','${req.body.email}','1','${moment().format()}')`, vals, function (err, result) {
            if (err) res.json({ success: false, msg: err });
        });
    });






    /* PDF creating test
        const doc = new PDFDocument()
       // let filename = req.body.filename
       let filename="test";
        // Stripping special characters
        filename = encodeURIComponent(filename) + '.pdf'
        // Setting response to 'attachment' (download).
        // If you use 'inline' here it will automatically open the PDF
      //  res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"')
      //  res.setHeader('Content-type', 'application/pdf')
    
    
        const content = "Test content";
        doc.y = 300
        doc.text(content, 50, 50)
        doc.pipe(fs.createWriteStream('/tmp/output.pdf'));
       // doc.pipe(res)
        doc.end() */


    res.json({ success: true, msg: "Tickets created!" });

    // connection.end();
    // next();
}




const newshowing = function (req, res) {
    let values = Object.keys(req.body).map(function (key) {
        return req.body[key];
    });
    console.log(values);

    values[3] = values[3].slice(0, 19).replace('T', ' ');
    values = values.map((record) => {
        return `'${record}'`;
    });
    //2018-08-03T09:28:00.000Z
    connection.query("INSERT INTO showings(film,price,room,date) VALUES(" + values.join(",") + ")", function (err, result) {
        if (err) res.json({ success: false, msg: err });
        res.json({ success: true, msg: values });
    });

}



const newfilm = function (req, res) {
    console.log(req.body);
    const params = req.body;
    let values = Object.keys(req.body).map(function (key) {
        return req.body[key];
    });
    values = values.map((record) => {
        return `'${record}'`;
    });
console.log(values)
    connection.query("INSERT INTO films(title,director,genre,length,category,imageurl) VALUES(" + values.join(",") + ")", function (err, result) {
        if (err) res.json({ success: false, msg: err });
        res.json({ success: true, msg: values });
    });
}


const newprice = function (req, res) {
    connection.query(`INSERT INTO prices(normal,discount) VALUES('${req.body.normal}','${req.body.discount}')`, function (err, result) {
        if (err) res.json({ success: false, msg: err });
        res.json({ success: true, msg: "PRICES_ADDED" });
    });
}


const deleteshowing = function (req, res) {
    console.log(req.body);
    connection.query(`DELETE FROM showings WHERE ID="${req.body.showid}"`, function (err, result) { 
        if (err) res.json({ success: false, msg: err });
        res.json({ succes: true, msg: "Showing deleted" });
    });
}


const deletefilm = function (req, res) { // delete tickets(showing(film))
    const film = req.body;
    console.log(film);
    connection.query("DELETE FROM films WHERE ID=" + film.filmid, function (err, result) {
        if (err) res.json({ succes: false, msg: err });
        res.json({ succes: true, msg: "FILM_DELETED" });
    });
}

const editfilm = function (req, res) {
    const film = req.body;
    connection.query(`UPDATE films SET title='${film.title}',director='${film.director}',genre='${film.genre}',length='${film.length}',category='${film.category}',imageUrl='${film.imageUrl}' WHERE id='${film.id}'`, function (err, result) {
        if (err) res.json({ success: false, msg: err });
        res.json({ succes: true, msg: film });
    });
}


const editcustomer = function (req, res) {
    const customer = req.body;
    connection.query(`UPDATE customers SET email='${customer.email}',name='${customer.name}',surename='${customer.surename}',telephone='${customer.telephone}' WHERE id='${customer.id}'`, function (err, result) {
        if (err) res.json({ success: false, msg: err });
        res.json({ succes: true, msg: customer });
    });

}


const deleteprice = function (req, res) { //delete tickets(showing(price))
    const params = req.body;
    connection.query("DELETE FROM prices WHERE ID=" + params.priceid, function (err, result) {
        if (err) res.json({ success: false, msg: err });
        res.json({ succes: true, msg: params });
    });

}


const deleteticket = function (req, res) { //delete tickets(showing(price))
    const params = req.body;
    connection.query("DELETE FROM tickets WHERE ID=" + params.ticketid, function (err, result) {
        if (err) res.json({ success: false, msg: err });
        res.json({ succes: true, msg: params });
    });

}

//select t.id ,s.title, t.seat,t.price,t.email,t.status,t.purchasedate FROM tickets t, showings s WHERE t.showing=s.id"
const ticketsquery = function (req, res) {
    connection.query('select t.id, f.title, t.seat, t.price, t.email, t.status, t.purchasedate FROM tickets t, films f, showings s WHERE s.id=t.showing AND f.id=s.film', function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}


const ticketsbycustomer = function (req, res) {
    const params = req.body;
    connection.query("select * from tickets  t, showings s, films f WHERE t.showing=s.id AND s.film=f.id AND email IN (SELECT email FROM customers WHERE id=" + params.customerid + ")", function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}



const showingsquery = function (req, res) {
    connection.query("select * from showings", function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}


const roomsquery = function (req, res) {
    connection.query("select * from rooms", function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}


const pricesquery = function (req, res) {
    connection.query("select * from prices", function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}


const filmsquery = function (req, res) {
    connection.query("select * from films", function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}


/*
const sendtickets = function (req, res) {

    const params = req.body;
    console.log(params.tickets);


    const mailOptions = {
        from: 'charlotte.kihn6@ethereal.email',
        to: 'benuch91@gmail.com',
        subject: 'Tickets Cinemanode',
        html: params.tickets
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
    res.json({ "msg": params })
}*/


module.exports = { showings, showingsbydate, seatsshowing, seatstaken, newticket, ticketsquery, filmsquery, pricesquery, roomsquery, showingsquery, newshowing, newfilm, newprice, deleteshowing, deletefilm, deleteprice, deleteticket, ticketsbycustomer, editfilm, editcustomer };