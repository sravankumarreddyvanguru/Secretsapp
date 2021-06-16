//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose=require("mongoose");
const session = require('express-session');
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require('mongoose-findorcreate');
//const encrypt=require("mongoose-encryption");
//const md5=require("md5");
//const _=require("lodash");
//const bcrypt=require("bcrypt");
//const saltRounds=10;
const app = express();
//console.log(process.env.API_KEY);
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
  secret:"sravanWEBdev.",
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-sravan:Test123@cluster0.em9jx.mongodb.net/userDB",{useNewUrlParser:true,useUnifiedTopology: true});

mongoose.set("useCreateIndex",true);

//mongoose.set('useFindAndModify', false);
const userSchema= new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:String
  //username : { type: String,sparse:true}
});

//userSchema.plugin(encrypt, { secret:process.env.SECRET , encryptedFields: ['password']});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User=new mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
  //  console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res){
  res.render("home");
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/secrets');
  });

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});
/*app.post("/register",function(req,res){
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  const newUser=new User({
      email:req.body.username,
      password:hash
    });
    newUser.save(function(err){
      if(!err)
      res.render("secrets");
      else
      console.log(err);
    });
});

});*/
/*app.post("/login",function(req,res){
User.findOne({email:req.body.username},function(err,foundUser){
if(err)
console.log(err);
else{
  if(foundUser){
    bcrypt.compare(req.body.password,foundUser.password, function(err, result) {
      if(result == true)
      res.render("secrets");
      else
      res.send("wrong password");
  });
}
  else
  res.send("NO Users found");
}
});
});*/
app.get("/secrets",function(req,res){
User.find({"secret":{$ne:null}},function(err,foundUsers){
  if(err)
  console.log(err);
  else{
  if(foundUsers){
    res.render("secrets",{usersWithSecrets:foundUsers});
  }
  }
});
});
app.post("/register",function(req,res){
User.register({username:req.body.username},req.body.password,function(err,user){
  if(err){
    console.log(err);
    res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
});
});
app.post("/login",function(req,res){
const user=new User({
  username:req.body.username,
  password:req.body.password
});
req.login(user,function(err){
  if(err)
  console.log(err);
  else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
  }
});

});
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});
app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else
  res.redirect("/login");
});
app.post("/submit",function(req,res){
  const submittedSecret=req.body.secret;
User.findById(req.user._id,function(err,foundUser){
  if(err)
  console.log(err);
  else{
    if(foundUser){
      foundUser.secret=submittedSecret;
      foundUser.save(function(){
        res.redirect("/secrets");
      });
    }
  }
});
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);

