/**********************************************************
*************************REQUIRES**************************
**********************************************************/
const express = require('express');                // Express
const bodyParser = require('body-parser');         // Parsing HTTP messages
const assets = require('./assets');                // Assets
const multer = require('multer');                  // Multer - for storage
const sqlite3 = require('sqlite3');                // SQLite3 - Database
const fs = require('fs');                          // File System
const request = require('request');                // Google login - Forget user's non-Davis email login attempt
const passport = require('passport');              // Google Login
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieParser = require('cookie-parser');     // Cookies
const expressSession = require('express-session'); // Cookies

/**********************************************************
*************************CONSTANTS*************************
**********************************************************/
const buildGradTable = "CREATE TABLE IF NOT EXISTS GradTable(rowIdNum TEXT PRIMARY KEY, gradFirstName TEXT, gradLastName TEXT, gradMajor1 TEXT, gradMajor2 TEXT, gradMinor1 TEXT, gradMinor2 TEXT, gradGender TEXT, gradHomeTown TEXT, gradPreferredTransport TEXT, gradBio TEXT, gradPic TEXT)";
const buildMajorsMinors = "CREATE TABLE IF NOT EXISTS MajorsMinors(name TEXT PRIMARY KEY, major BOOLEAN, minor BOOLEAN)";
const selectGradTable = "SELECT * FROM GradTable WHERE rowIdNum = ?";
const selectMajorsMinors = "SELECT * FROM MajorsMinors";
const insertGradTable = "INSERT INTO GradTable(rowIdNum, gradFirstName, gradLastName, gradMajor1, gradMajor2, gradMinor1, gradMinor2, gradGender, gradHomeTown, gradPreferredTransport, gradBio, gradPic) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM GradTable WHERE rowIdNum = ?)";
const insertMajorsMinors = "INSERT INTO MajorsMinors(name, major, minor) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM MajorsMinors WHERE name = ?)";
const updateGradTable = "UPDATE GradTable SET gradFirstName = ?, gradLastName = ?, gradMajor1 = ?, gradMajor2 = ?, gradMinor1 = ?, gradMinor2 = ?, gradGender = ?, gradHomeTown = ?, gradPreferredTransport = ?, gradBio = ?, gradPic = ? WHERE rowIdNum = ?";
const deleteFromGradTable = "DELETE FROM GradTable WHERE rowIdNum = ?";
const truncateTableGradTable = "TRUNCATE TABLE GradTable";
const deleteTableGradTable = "DELETE TABLE GradTable";

/**********************************************************
*************************VARIABLES*************************
**********************************************************/
let userEmail = "";

// Setup passport, passing it information about what we want to do
passport.use(new GoogleStrategy(
    // object containing data to be sent to Google to kick off the login process
    {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: 'https://roan-iced-stetson.glitch.me/auth/accepted',
        userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo', // where to go for info
        scope: ['profile', 'email']  // the information we will ask for from Google
    },
    // function to call to once login is accomplished, to get info about user from Google;
    // it is defined down below.
    gotProfile));

// Start setting up the Server pipeline
const app = express();

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

console.log("setting up pipeline")

// take HTTP message body and put it as a string into req.body
app.use(bodyParser.urlencoded({ extended: true }));

// puts cookies into req.cookies
app.use(cookieParser());

// pipeline stage that echos the url and shows the cookies, for debugging.
app.use("/", printIncomingRequest);

// Now some stages that decrypt and use cookies
// express handles decryption of cooikes, storage of data about the session, 
// and deletes cookies when they expire
app.use(expressSession(
    {
        secret: 'bananaBread',  // a random string used for encryption of cookies
        maxAge: 6 * 60 * 60 * 1000, // 6 hour timeout
        resave: true,
        saveUninitialized: false,
        // make a named session cookie; makes one called "connect.sid" as well
        name: "ecs162-session-cookie"
    }));

// Initializes request object for further handling by passport
app.use(passport.initialize());

// If there is a valid cookie, will call passport.deserializeUser() which is defined below.  
// We can use this to get user data out of a user database table. Does nothing if there is no cookie
app.use(passport.session());

// Public files are still serverd as usual out of /public
app.get('/*', express.static('public'));

// special case for base URL, goes to index.html
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

// Glitch assests directory 
app.use("/assets", assets);

// stage to serve files from /user, only works if user in logged in

// If user data is populated (by deserializeUser) and the
// session cookie is present, get files out 
// of /user using a static server. 
// Otherwise, user is redirected to public splash page (/index) by
// requireLogin (defined below)
app.get('/user/*', requireUser, requireLogin, express.static('.'));

// Now the pipeline stages that handle the login process itself

// Handler for url that starts off login with Google.
// The app (in public/index.html) links to here (note not an AJAX request!)
// Kicks off login process by telling Browser to redirect to Google.
app.get('/auth/google', passport.authenticate('google'));
// The first time its called, passport.authenticate sends 302 
// response (redirect) to the Browser
// with fancy redirect URL that Browser will send to Google,
// containing request for profile, and
// using this app's client ID string to identify the app trying to log in.
// The Browser passes this on to Google, which brings up the login screen. 


// Google redirects here after user successfully logs in. 
// This second call to "passport.authenticate" will issue Server's own HTTPS 
// request to Google to access the user's profile information with the  	
// temporary key we got from Google.
// After that, it calls gotProfile, so we can, for instance, store the profile in 
// a user database table. 
// Then it will call passport.serializeUser, also defined below.
// Then it either sends a response to Google redirecting to the 
// /setcookie endpoint, below
// or, if failure, it goes back to the public splash page. 
// NOTE:  Apparently, this ends up at the failureRedirect if we
// do the revoke in gotProfile.  So, if you want to redirect somewhere
// else for a non-UCDavis ID, do it there. 
app.get('/auth/accepted',
    passport.authenticate('google',
        { successRedirect: '/setcookie', failureRedirect: '/?verified=0&firstLogin=0' }
    )
);

// One more time! a cookie is set before redirecting
// to the protected homepage
// this route uses two middleware functions.
// requireUser is defined below; it makes sure req.user is defined
// the second one makes a public cookie called
// google-passport-example
app.get('/setcookie', requireUser,
    function (req, res) {
        // set a public cookie; the session cookie was already set by Passport
        // JSON.stringify(obj, null, 2)
        let usr = req.user.userData;
        console.log("setcookie req: " + usr);

        if (usr.substring(usr.length - 12, usr.length) == "@ucdavis.edu") {
            graduatesDB.each(selectGradTable, [usr], function (err, rows) {
                console.log(rows.gradFirstName);
                // User is inserted into the database in gotProfile with gradFirstName = tempFirstName.
                // This is used to determine if the questionnaire has been filled out before.
                if (rows.gradFirstName != "tempFirstName") {
                    // Set cookie and redirect to existing user page
                    res.cookie('ucd-yearbook', new Date());
                    res.redirect('/?verified=1&firstLogin=0');
                }
                else {
                    // Set cookie and redirect to questionnaire
                    res.cookie('ucd-yearbook', new Date());
                    res.redirect('/?verified=1&firstLogin=1');
                }
            });
        }
        else {
            // This is not a UC Davis Email Address, so clear any cookies and redirect to verification failure page
            res.clearCookie('ucd-yearbook');
            res.clearCookie('ecs162-session-cookie');
            res.redirect('/?verified=0&firstLogin=0');
        }
    }
);

// currently not used
// Clear the cookie and close the session
app.get('/user/logoff',
    function (req, res) {
        // clear both the public and the named session cookie
        res.clearCookie('ucd-yearbook');
        res.clearCookie('ecs162-session-cookie');
        res.redirect('/');
    }
);

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
    console.log('Your app is listening on port ' + listener.address().port);
});

// Some functions called by the handlers in the pipeline above
// Function for debugging. Just prints the incoming URL, and calls next.
// Never sends response back. 
function printIncomingRequest(req, res, next) {
    console.log("Serving", req.url);
    /*if (req.cookies) {
      console.log("cookies",req.cookies)
    }*/
    next();
}

// function that handles response from Google containing the profiles information. 
// It is called by Passport after the second time passport.authenticate is called (on line 40)
function gotProfile(accessToken, refreshToken, profile, done) {
    let error = "";

    //console.log("Google profile",profile);
    // here is a good place to check if user is in DB,
    // and to store him in DB if not already there. 
    // Second arg to "done" will be passed into serializeUser,
    // should be key to get user out of database.
    userEmail = profile.emails[0].value;
    if (userEmail.substring(userEmail.length - 12, userEmail.length) == "@ucdavis.edu") {
        console.log(userEmail + " is verified");
        let foundID = false;
        graduatesDB.run(selectGradTable, [userEmail], function (err, row) {
            if (!err) {
                foundID = true;
            }
        });
        if (!foundID) {
            graduatesDB.run(insertGradTable, [userEmail, "tempFirstName", "tempLastName", "", "", "", "", "", "", "", "", "", userEmail], function (err) {
                if (err) {
                    console.log("Couldn't insert graduate into database: " + err);
                }
            });
        }

    }
    else {
        console.log(userEmail + " is not verified");
        error = "error";
        request.get('https://accounts.google.com/o/oauth2/revoke', {
            qs: { token: accessToken }
        }, function (err, res, body) {
            console.log("revoked token");
        })
        //return to homescreen and have error message pop up or something
        /**************************************************************
        **************************************************************/
    }

    done(null, userEmail);
}

// Part of Server's sesssion set-up.  
// The second operand of "done" becomes the input to deserializeUser
// on every subsequent HTTP request with this session's cookie. 
// For instance, if there was some specific profile information, or
// some user history with this Website we pull out of the user table
// using dbRowID.  But for now we'll just pass out the dbRowID itself.
passport.serializeUser((dbRowID, done) => {
    console.log("SerializeUser. Input is", dbRowID);
    done(null, dbRowID);
});

// Called by passport.session pipeline stage on every HTTP request with
// a current session cookie (so, while user is logged in)
// This time, 
// whatever we pass in the "done" callback goes into the req.user property
// and can be grabbed from there by other middleware functions
passport.deserializeUser((dbRowID, done) => {
    console.log("deserializeUser. Input is:", dbRowID);
    // here is a good place to look up user data in database using
    // dbRowID. Put whatever you want into an object. It ends up
    // as the property "user" of the "req" object. 
    let userData = { userData: dbRowID };
    done(null, userData);
});

function requireUser(req, res, next) {
    console.log("require user", req.user)
    if (req.user == "error") {
        res.redirect('vivid-rattle-epoch/index.html/query?verified=0&firstLogin=0');
    } else {
        console.log("user is", req.user);
        next();
    }
};

function requireLogin(req, res, next) {
    console.log("checking:", req.cookies);
    if (!req.cookies['ecs162-session-cookie']) {
        res.redirect('/');
    } else {
        next();
    }
};

/******************************************************************
************************Database Stuff*****************************
******************************************************************/

// Establish connection to database
let graduatesDB = new sqlite3.Database('./db/graduates.db');

// Create table for graduates
graduatesDB.run(buildGradTable, function (err, val) {
    if (err == '') {
        console.log("created table");
    }

    else {
        console.log(err);
    }
});

// Create table for majors and minors
graduatesDB.run(buildMajorsMinors, function (err, val) {
    if (err == null) {
        console.log("Created MajorsMinors Table. Updating List...");
        let majorData = [];
        let minorData = [];

        // Read and retrieve Majors data from Majors text file
        fs.readFile('./static/majors.txt', 'utf8', (err, data) => {
            if (err) {
                console.log("Error reading Majors.txt file: " + err);
                return;
            }

            majorData = data.split('\n');

            // Read and retrieve Minors data from Minors text file
            fs.readFile('./static/minors.txt', 'utf8', (err2, data2) => {
                if (err2) {
                    console.log("Error reading Minors.txt file: " + err2);
                    return;
                }

                minorData = data2.split('\n');

                for (let i = 0; i < majorData.length; i++) {
                    // Insert as Major and Minor
                    if (minorData.includes(majorData[i])) {
                        graduatesDB.run(insertMajorsMinors, [majorData[i], true, true, majorData[i]], function (err) {
                            if (err) {
                                console.log("Error inserting Major/Minor " + majorData[i] + ": " + err);
                            }
                        })
                    }

                    // Insert only as Major
                    else {
                        graduatesDB.run(insertMajorsMinors, [majorData[i], true, false, majorData[i]], function (err) {
                            if (err) {
                                console.log("Error inserting Major " + majorData[i] + ": " + err);
                            }
                        })
                    }
                }

                for (let i = 0; i < minorData.length; i++) {
                    // Insert only as Minor
                    if (!majorData.includes(minorData[i])) {
                        graduatesDB.run(insertMajorsMinors, [minorData[i], false, true, minorData[i]], function (err) {
                            if (err) {
                                console.log("Error inserting Minor " + minorData[i] + ": " + err);
                            }
                        })
                    }
                }
            })
        })
    }
    else {
        console.log("Received error when creating MajorsMinors Table: " + err);
    }
});


/******************************************************************
*************************Image Storage*****************************
******************************************************************/
// Set up diskStorage
let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/images')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

// let upload = multer({dest: __dirname+"/assets"});
let upload = multer({ storage: storage });

// Serve static files out of public directory
app.use(express.static('public'));

// Also serve static files out of /images
app.use("/images", express.static('images'));


/******************************************************************
**************************DB Post Requests*************************
******************************************************************/
// Handle a post request containing JSON
app.use(bodyParser.json());

// Saves a graduate's questionnaire information
app.post('/saveProfile', function (request, response) {
    // request.body will contain the "parameters" passed to the web request
    let updateParams = [request.body.firstname,
    request.body.lastname,
    request.body.major1,
    request.body.major2,
    request.body.minor1,
    request.body.minor2,
    request.body.gender,
        "tempGradHomeTown",
        "tempGradPreferredTransport",
        "tempGradBio",
        "tempGradPic",
        userEmail];

    graduatesDB.run(updateGradTable, updateParams, function (err) {
        if (err) {
            response.send("Error: " + err);
        }
        else {
            response.send("Successfully saved profile information");
        }
    });
});

// Handle a post request to upload an image. 
app.post('/upload', upload.single('newImage'), function (request, response) {
    console.log("Recieved", request.file.originalname, request.file.size, "bytes")
    if (request.file) {
        // file is automatically stored in /images, 
        // even though we can't see it. 
        // We set this up when configuring multer
        response.end("recieved " + request.file.originalname);
    }
    else throw 'error';
});

/******************************************************************
***************************Get Request*****************************
******************************************************************/
app.use(bodyParser.json());
app.post("/getAttributes", function (request, response) {
    console.log(request.body);
    let searchScript = "SELECT rowIdNum FROM GradTable ";
    let searchParams = [];

    let searchFirstName = request.body.firstName;
    let searchLastName = request.body.lastName;
    let searchMajors = request.body.major;
    let searchMinors = request.body.minor;
    let searchTransport = request.body.preferredTransport;

    if (searchFirstName != "" && searchFirstName != " " && searchFirstName != undefined) {
        searchScript += "WHERE gradFirstName LIKE ? ";
        searchParams.push("%" + searchFirstName + "%");
    }

    if (searchLastName != "" && searchLastName != " " && searchLastName != undefined) {
        if (searchParams.length > 0) {
            searchScript += "OR gradLastName LIKE ? ";
        }
        else {
            searchScript += "WHERE gradLastName LIKE ? ";
        }

        searchParams.push("%" + searchLastName + "%");
    }

    if (searchMajors != "" && searchMajors != " " && searchMajors != undefined) {
        if (searchParams.length > 0) {
            searchScript += "OR gradMajor1 LIKE ? OR gradMajor2 LIKE ? ";
        }
        else {
            searchScript += "WHERE gradMajor1 LIKE ? OR gradMajor2 LIKE ? ";
        }

        searchParams.push("%" + searchMajors + "%", "%" + searchMajors + "%");
    }

    if (searchMinors != "" && searchMinors != " " && searchMinors != undefined) {
        if (searchParams.length > 0) {
            searchScript += "OR gradMinor1 LIKE ? OR gradMinor2 LIKE ? ";
        }
        else {
            searchScript += "WHERE gradMinor1 LIKE ? OR gradMinor2 LIKE ? "
        }

        searchParams.push("%" + searchMinors + "%", "%" + searchMinors + "%");
    }

    if (searchTransport != "" && searchTransport != " " && searchTransport != undefined) {
        if (searchParams.length > 0) {
            searchScript += "OR gradPreferredTransport LIKE ? ";
        }
        else {
            searchScript += "WHERE gradPreferredTransport LIKE ? ";
        }

        searchParams.push("%" + searchTransport + "%");
    }

    graduatesDB.all(searchScript, searchParams, function (err, rows) {
        if (err) {
            console.log("Error while querying gradTable: " + err);
            console.log("SELECT SCRIPT: " + searchScript);
            console.log("PARAMETERS: " + searchParams);
            response.send("Error: " + err);
        }
        else {
            console.log("Successfully queried gradTable");
            response.send(rows);
        }
    })
});

app.get("/getAllMajorsMinors", function (request, response) {
    graduatesDB.all(selectMajorsMinors, function (err, allMajorsMinors) {
        if (err) {
            response.send("Error: " + err);
        }
        else {
            response.send(allMajorsMinors);
        }
    })
});