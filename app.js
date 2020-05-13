const express= require('express')
const session=require('express-session')

const MongoStore= require('connect-mongo')(session)
const flash=require('connect-flash')
//for spacing in the post body
const markdown =require('marked')

//token needed to justify that it is not a malicious user
const csrf= require('csurf')
const app=express()
const sanitizeHTML=require('sanitize-html')

//req.body can be used
app.use(express.urlencoded({extended:false}))
app.use(express.json())

app.use('/api',require('./router-api'))

//sessions and tokens
//session means login garesi tei user le chalaira ho bhanera thapaune
//enabling session
let sessionOptions=session({
    secret: "JavaScript is sooooooooo coool",
    //session garyo ki default store chai server ma huncha which get erased when computer is turned off
    //so connect-mongo use gareko to store session in database
    //MongoStore is a blueprint
    store: new MongoStore({client: require('./db')}),
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true}
    
})


app.use(sessionOptions)
//now app supports session


//to pop up boxes
app.use(flash())

//to remove duplication
//middleware
//whenver any req to app.use is made then the function below runs first
app.use(function(req,res,next){
    //make our markdown funcn available from ejs template
    res.locals.filterUserHTML = function(content){
        return sanitizeHTML(markdown(content),{allowedTags:['p','br','ul','li','bold','h1'],allowedAttributes:{}})
    }

    //make all error and flash messages available from all templates
    res.locals.errors= req.flash("errors")
    res.locals.success = req.flash("success")

    //make current user id available on the req object
    //the line below is used for viewing post by guest or other id
    //visitorId is property to req
    if(req.session.user){req.visitorId = req.session.user._id } else{req.visitorId=0}

    //res.locals.user has a user property/obj that can be accessed from any ejs template
    res.locals.user = req.session.user
    next()//the actual relevent func for the route is run in next()
})

//require is also used for js file
const router=require('./router.js')

app.use(express.static('public'))

//first arg is becsaue of express and second is the folder name to see the html template
app.set('views','views')
app.set('view engine','ejs')

app.use(csrf())

//middleware for csrf
app.use(function(req,res,next){
  //that i want to ouput in the html template
  res.locals.csrfToken = req.csrfToken()
  next()
})

app.use('/',router)

//to solve ourselves of csrf
app.use(function(err,req,res,next){
  if(err){
    if(err.code == "EBADCSRFTOKEN"){
      req.flash('errors',"Cross site req forgery detected.")
      req.session.save(()=> res.redirect('/'))
    }else{
      res.render('404')
    }
  }
})

//for socket.io in which the server and browser both listens all the time
//below we created a server that is going to use our express app as a handler
const server = require('http').createServer(app)

//overall server and app is being listenend at 3000
const io = require('socket.io')(server)

//no need to memorize this
//express session package to integrate with the socket io so that we can get session data like username and avatar and store in server to get retreived in all the other chat through socket io
io.use(function(socket, next) {
    sessionOptions(socket.request, socket.request.res, next)
  })


io.on('connection', function(socket) {
     //only if they are logged in
    if (socket.request.session.user) {
      let user = socket.request.session.user//usernmae,avatar
        
       //since socket.broadcast le current user involve gardaina but we still need the username and avatar of current user so we use this
      socket.emit('welcome', {username: user.username, avatar: user.avatar})
  
       //connection between browser and server
    // console.log("a nwe user connected")
      socket.on('chatMessageFromBrowser', function(data) {
           // console.log(data.message)
        //socket.emit() //garyo ki tyo browser ma pathao manchey lai matra jancha
        //socket.broadcast le CURRENT USER bahek aru lai pathaucha
        socket.broadcast.emit('chatMessageFromServer', {message: sanitizeHTML(data.message, {allowedTags: [], allowedAttributes: {}}), username: user.username, avatar: user.avatar})// server bata sab connected user lai jancha in browser
      })
    }
  })

//instead of listening to port , we are exporting to db.js so that at first there is a connection with the db and then app.js is run 
// module.exports=app
module.exports = server