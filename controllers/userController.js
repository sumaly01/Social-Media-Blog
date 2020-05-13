const User=require('../models/User')
const Post=require('../models/Post')
// to find the data from follow model
const Follow=require('../models/Follow')
const jwt = require('jsonwebtoken')

exports.apiGetPostsByUsername = async function(req,res){
  try{
    let authorDoc = await User.findByUsername(req.params.username)
    let posts = await Post.findByAuthorId(authorDoc._id)
    res.json(posts)
  }catch{
    res.json("Sorry invalid")
  }
}

exports.apiMustBeLoggedIn = function(req,res,next){
  try{
   req.apiUser= jwt.verify(req.body.token,process.env.JWTSECRET)
  next()
  }catch{
    res.json("sorry you must provide a valid token.")
  }
}

exports.doesUsernameExist = function( req,res){
  //eq.body.usernmae ma username bhaneko name ho 
  User.findByUsername(req.body.username).then(function(){
    res.json(true)
  }).catch(function(){
    res.json(false)
  })
}

exports.doesEmailExist = async function(req,res){
  let emailBool =await User.doesEmailExist(req.body.email)
  res.json(emailBool)
}

//if they are FOLLOWED to the other person then following and followers can be seen
exports.sharedProfileData = async function(req, res, next) {
    let isVisitorsProfile = false
    let isFollowing = false
    if (req.session.user) {
      isVisitorsProfile = req.profileUser._id.equals(req.session.user._id)//returns true or false
      isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId)
    }
  
    req.isVisitorsProfile = isVisitorsProfile
    req.isFollowing = isFollowing

// since these three tasks are independenet to one another, we donot need to await separatly
// let postCount= await Post.countPostsByAuthor()
// let followerCount= await Follow.countFollowersById()
// let followingCount= await Follow.countFollowingById()

//retrieve post, follower, and following counts
let postCountPromise= Post.countPostsByAuthor(req.profileUser._id)
let followerCountPromise= Follow.countFollowersById(req.profileUser._id)
let followingCountPromise= Follow.countFollowingById(req.profileUser._id)
let [postCount, followerCount,followingCount] = await Promise.all([postCountPromise,followerCountPromise,followingCountPromise])    
    
    req.postCount = postCount
    req.followerCount = followerCount
    req.followingCount = followingCount

next()
  }


exports.mustBeLoggedIn = function(req, res, next) {
    if (req.session.user) {
        //next() represents the next function in router
      next()
    } else {
      req.flash("errors", "You must be logged in to perform that action.")
      req.session.save(function() {
        res.redirect('/')
      })
    }
  }

//just like module.exports where login is a property
exports.login = function(req, res) {
    let user = new User(req.body)
    //login() returns a promise
    //then() le chai resolve lai matra kam garcha
    user.login().then(function(result) {
        //yo tala ko line ma user ko thau ma aru j nam rakhenni huncha 
        //http req is stateless, euta bata arko ma jada no memory but session le chai memory ma store garcha tyo value lai 
      req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id}
      // res.send(result)
        //save() manually saves session data to database
      req.session.save(function() {
        res.redirect('/')
      })
    }).catch(function(e) {
         // res.send(`the value is ` + e)
      req.flash('errors', e)
        // res.redirect('/')
        //saves manually in database the line below is used
      req.session.save(function() {
        res.redirect('/')
      })
    })
  }

  //for postman
exports.apiLogin = function(req, res) {
  let user = new User(req.body)
  //login() returns a promise
  //then() le chai resolve lai matra kam garcha
  user.login().then(function(result) {
    //a = store in the token
    //b= secret phrase that the package will use to generate a token in .env
    //c= expire
     res.json(jwt.sign({_id : user.data._id},process.env.JWTSECRET,{expiresIn: '7d'}))
  }).catch(function(e) {
      res.json("not")
  })
}

exports.logout = function(req, res) {
    req.session.destroy(function() {
      res.redirect('/')
    })
  }


exports.register = function(req, res) {
    let user = new User(req.body)
    user.register().then(() => {
      req.session.user = {username: user.data.username, avatar: user.avatar, _id: user.data._id}
      req.session.save(function() {
        res.redirect('/')
      })
    }).catch((regErrors) => {
      regErrors.forEach(function(error) {
           //second argument is getting pushed to the regErrors array
        req.flash('regErrors', error)
      })
      req.session.save(function() {
        res.redirect('/')
      })
    })
  }

exports.home = async function(req, res) {
    if (req.session.user) {
      //fetch feed of posts for current user
      let posts = await Post.getFeed(req.session.user._id)

        //render can have two arguments also
      res.render('home-dashboard',{posts: posts})
    } else {
          //access and delete the value from database's session if flash package is used here
      res.render('home-guest', {/*errors:req.flash('errors'),*/regErrors: req.flash('regErrors')})
    }
  }

//params means url ma lekheko value
//req.profileUser is used to store the username already in database, to be used in the funciton prfilePostsScreen
exports.ifUserExists = function(req, res, next) {
    User.findByUsername(req.params.username).then(function(userDocument) {
      req.profileUser = userDocument
      next()
    }).catch(function() {
      res.render("404")
    })
  }

//views posts on screen
exports.profilePostsScreen = function(req, res) {
    // ask our post model for posts by a certain author id
    Post.findByAuthorId(req.profileUser._id).then(function(posts) {
      console.log(req.profileUser)
      res.render('profile', {
        //to know the current page among posts,followers and following
        currentPage:"posts",
        title:`Profile for ${req.profileUser.username}`,
        posts: posts,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        // user: req.profileUser,
        isVisitorsProfile: req.isVisitorsProfile,
        counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
      })
    }).catch(function() {
      res.render("404")
    })
  
  }

//for showing followers

exports.profileFollowersScreen = async function(req, res) {
    try {
      let followers = await Follow.getFollowersById(req.profileUser._id)
      //followers is array
      res.render('profile-followers', {
        currentPage:"followers",
        followers: followers,
        profileUsername: req.profileUser.username,
        profileAvatar: req.profileUser.avatar,
        isFollowing: req.isFollowing,
        isVisitorsProfile: req.isVisitorsProfile,
        counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
      })
    } catch {
      res.render("404")
    }
  }

  //for showing following
exports.profileFollowingScreen = async function(req, res) {
  try {
    let following = await Follow.getFollowingById(req.profileUser._id)
    //followers is array
    res.render('profile-following', {
      currentPage:"following",
      following: following,
      profileUsername: req.profileUser.username,
      profileAvatar: req.profileUser.avatar,
      isFollowing: req.isFollowing,
      isVisitorsProfile: req.isVisitorsProfile,
      counts: {postCount: req.postCount, followerCount: req.followerCount, followingCount: req.followingCount}
    })
  } catch {
    res.render("404")
  }
}

