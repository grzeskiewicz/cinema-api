const express = require('express'),
    app = express();
const cors = require('cors');
app.use(cors());

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies 

const db = require('../database/database');
const user = require('../usercontroller/usercontroller');
const uploadImg = require('../upload/uploadImg');


app.options('*', cors()) // include before other routes


app.get('/showings', db.showings);
app.get('/showingsbydate/:date', db.showingsbydate);
app.get('/seatsshowing/:showingid', db.seatsshowing);
app.get('/seatstaken/:showingid', db.seatstaken);

app.post('/newticket', db.newticket);
app.post('/newticket', db.createPDF);
app.post('/newticket', db.sendEmail);

app.post('/getpdf', db.getPDF);


app.post('/newshowing', db.newshowing);
app.post('/newfilm', db.newfilm);
app.post('/newprice', db.newprice);

app.post('/deleteshowing', db.deleteshowing);
app.post('/deletefilm', db.deletefilm);
app.post('/deleteprice', db.deleteprice);
app.post('/deleteticket', db.deleteticket);

app.post('/editfilm', db.editfilm);
app.post('/editcustomer', db.editcustomer);
app.post('/editprice', db.editprice);


app.get('/tickets', db.ticketsquery);
app.get('/rooms', db.roomsquery);
app.get('/prices', db.pricesquery);
app.get('/films', db.filmsquery);
app.get('/showingsquery', db.showingsquery);
app.post('/ticketsbycustomer', db.ticketsbycustomer);



//app.route('/newticket').post(user.loginRequired, db.newticket);

app.post('/register', user.register);
app.post('/login', user.login);
app.get('/memberinfo', user.memberinfo);
app.get('/customers', user.customers);
app.post('/deletecustomer', user.deletecustomer);
//app.post('/upload-img', uploadImg.upload);
app.post('/upload-img', uploadImg.upload, (req, res, next) => {
    res.json({ success: true, message: req.file.filename});
    
    /*  if (!req.file) {
          const error = new Error('Please upload a file')
          error.httpStatusCode = 400
          //    return next(error)
          res.json(error);
      } else {
          // console.log(res.req.file.filename);
          req.body.filename = res.req.file.filename;
          //      next();
          // res.json ({success:true, msg: "FILE UPLOADED"});
      }*/
})

//app.post('/upload-img', user.updateUserSignature);

/* PASSPORT SETUP */
const passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());


app.get('/success', (req, res) => {
    //console.log(passport);

    res.send("You have successfully logged in");

});
app.get('/error', (req, res) => res.send("error logging in"));
passport.serializeUser(function (user, cb) {
    // console.log(user);
    cb(null, user);
});
passport.deserializeUser(function (obj, cb) {
    cb(null, obj);
});


/* FACEBOOK AUTH */
const FacebookStrategy = require('passport-facebook').Strategy;
const FACEBOOK_APP_ID = '255080745147654';
const FACEBOOK_APP_SECRET = 'fcce20e07201bd900e9d465e69f29f0e';
passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: "/auth/facebook/callback"
},
    function (accessToken, refreshToken, profile, cb) {
        //console.log(profile.displayName);
        return cb(null, profile);
    }
));
app.get('/auth/facebook',
    passport.authenticate('facebook'));
app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/error' }),
    function (req, res) {
        res.redirect(`/success`);
    });



module.exports = app;