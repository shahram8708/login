const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const User = require('./models/user');
const MongoStore = require('connect-mongo');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

const uri = "mongodb+srv://ramcoding8:Shah6708@cluster0.jibojlz.mongodb.net/Login?retryWrites=true&w=majority";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Connected to MongoDB!");
    })
    .catch((error) => {
        console.error("Error connecting to MongoDB:", error);
    });

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const sessionStore = MongoStore.create({
    mongoUrl: uri,
    collection: 'sessions',
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { maxAge: 100 * 365 * 24 * 60 * 60 * 1000 },
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.render('login', { isAuthenticated: req.isAuthenticated(), errorMessage: req.flash('error') });
    }
});

app.get('/register', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.render('register', { isAuthenticated: req.isAuthenticated(), registrationMessage: req.flash('registrationMessage') });
    }
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            req.flash('error', 'User with this username already exists. Please login or use a different username.');
            return res.redirect('/login');
        }

        const user = new User({ username });
        await user.setPassword(password);
        await user.save();

        req.login(user, (err) => {
            if (err) {
                console.error(err);
                req.flash('error', 'Error during login after registration');
                return res.redirect('/login');
            }

            return res.redirect('/dashboard');
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error checking user registration');
        return res.redirect('/login');
    }
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true,
}));

app.get('/dashboard', isLoggedIn, (req, res) => {
    res.render('dashboard', { username: req.user.username });
});

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
