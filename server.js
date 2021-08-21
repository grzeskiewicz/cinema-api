const express = require('express'),
    app = express();
    app.use(express.json()); 

const cors = require('cors');
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3001",
        methods: ["GET", "POST"]
    }
});
//const bodyParser = require('body-parser');
app.use(cors());
//app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
//app.use(bodyParser.json()); // support json encoded bodies 
app.use('/pdf', express.static(__dirname + '/public/pdf'));



app.use(express.static('public/uploads'));


const routes = require('./routes/routes');
app.options('*', cors()) // include before other routes
app.use('/', routes);

console.log(__dirname);



io.on('connection', function (socket) {
    socket.broadcast.emit('hi');
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    socket.on('ticketordered', function (ticket) {
        console.log('message: ' + ticket);
        io.emit('seatstakennow', { showing: ticket.showing, seats: ticket.seats });
        io.emit('seatstakennow2', { ticket: ticket });
    });
});


const port = process.env.PORT || 3001,
    ip = process.env.IP || '127.0.0.1';

http.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app;