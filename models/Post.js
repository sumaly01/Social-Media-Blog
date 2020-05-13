//id in session data is simply a string of text

//creates new collection called posts
const postsCollection=require('../db').db().collection("posts")
const followsCollection=require('../db').db().collection("follows")
const User= require('./User')

// to bring any string to object id type
const ObjectID=require('mongodb').ObjectID
const sanitizeHTML=require('sanitize-html')

//requestedPostId is req.params.id
let Post = function(data,userid,requestedPostId){
    //data is incoming req.body wala ko data
    this.data=data
    this.errors= []
    this.userid=userid
    this.requestedPostId= requestedPostId
}

Post.prototype.cleanUp= function(){
    if(typeof(this.data.title) != "string"){this.data.title=""}
    if(typeof(this.data.body) != "string"){this.data.body=""}

    //get rid of any bogus properties
    this.data={
        title:sanitizeHTML(this.data.title.trim(),{allowedTags:[],allowedAttributes:[]}),
        body:sanitizeHTML(this.data.body.trim(),{allowedTags:[],allowedAttributes:[]}),
        createdDate: new Date(),
        //converts into object's id , id is specially treated in mongodb
        author: ObjectID(this.userid)
    }

}


Post.prototype.validate= function(){
    if(this.data.title == ""){this.errors.push("You must provide a title")}
    if(this.data.body == ""){this.errors.push("You must provide a content")}
}


Post.prototype.create= function(){
    return new Promise((resolve,reject) => {
        this.cleanUp()
        this.validate()
        if (!this.errors.length){
            //save post into database
            postsCollection.insertOne(this.data).then((info)=>{
                resolve(info.ops[0]._id)//create post garda initially id hunna so
            }).catch(()=>{
                this.errors.push("Please try again later.")
                reject(this.errors)
            })
        

        }else{

            reject(this.errors)
        }
    })
}


Post.prototype.update = function(){
    return new Promise(async (resolve,reject) => {
        //findSingleById() is used to know about visitorId and the posts Id
        try{
            let post= await Post.findSingleById(this.requestedPostId, this.userid)
      //post will run reusablePostQuery so post has access to isVisitorOwner
            if(post.isVisitorOwner){
                //actually update database
               let status= await this.actuallyUpdate()//"success" or "failure" is returned
                resolve(status)
       }else{
            reject()
       }
        }catch{
            reject()
        }
    })
}

Post.prototype.actuallyUpdate = function(){
    return new Promise(async(resolve,reject) => {
        this.cleanUp()
        this.validate()
        if(!this.errors.length){
           await postsCollection.findOneAndUpdate({_id: new ObjectID(this.requestedPostId)},{$set:{title: this.data.title,body:this.data.body}})
       resolve("success")
        }else{
            resolve('failure')

        }
    })
}


Post.reusablePostQuery = function(uniqueOperations,visitorId){
    //since yesma naya Post ko obj banako chaina so constructor tira ko tension linu pardaina
    //this sanga deal garnu pardaina so arrow func not used
    return new Promise(async function(resolve,reject){
    
    let aggOperations = uniqueOperations.concat([
        //an array
    
        //the data is to be taken form users collection
        //local field is post collection and foreign is user collection
        {$lookup: {from:"users",localField: "author", foreignField: "_id", as:"authorDocument"}},

        //fields that resulting objects to have
        {$project: {
            title: 1,
            body: 1,
            createdDate: 1,
            authorId:"$author",

            //$authorDocument pulls the value of authorDocument
            //0 represents first element of the array which lookup is returning 
            author: {$arrayElemAt :["$authorDocument",0]}
        }}
    ])
        //aggregate is used for many operations to be performed and it returns array which is actually returning a promise
        //to return username and gravatar for the post
        let posts= await postsCollection.aggregate(aggOperations).toArray()

        //clean up author propperty in each post object
        posts= posts.map(function(post){
            //isVisitorOwner is used in single=-post-screen ejs
            post.isVisitorOwner = post.authorId.equals(visitorId) // equals() return eithere T of F
           //to make it unavailable for front end users
            post.authorId = undefined

            post.author = {
                username: post.author.username,
                // so User model is required
                //.avatar is the property from User model
                avatar: new User(post.author,true).avatar
            }
            return post
        })

        resolve(posts)
    })
} 


//database is not actually manipulated
//since in postcontroller, it is not object oriented
Post.findSingleById = function(id,visitorId){
    //since yesma naya Post ko obj banako chaina so constructor tira ko tension linu pardaina
    //this sanga deal garnu pardaina so arrow func not used
    return new Promise(async function(resolve,reject){
        if(typeof(id) != "string" || !ObjectID.isValid(id)){
            reject()
            return
        }
       let posts = await Post.reusablePostQuery([
           {$match:{_id: new ObjectID(id)}}
       ],visitorId)

        if(posts.length){
            console.log(posts[0])
            resolve(posts[0])
            //returns first item of the array 
        }else{
            reject()
           
        }
    })
}



/*
//database is not actually manipulated
//since in postcontroller, it is not object oriented
Post.findSingleById = function(id){
    //since yesma naya Post ko obj banako chaina so constructor tira ko tension linu pardaina
    //this sanga deal garnu pardaina so arrow func not used
    return new Promise(async function(resolve,reject){
        if(typeof(id) != "string" || !ObjectID.isValid(id)){
            reject()
            return
        }
        //aggregate is used for many operations to be performed and it returns array which is actually returning a promise
        //to return username and gravatar for the post
        let posts= await postsCollection.aggregate([
            //an array
            {$match : {_id: new ObjectID(id)}},
            //the data is to be taken form users collection
            //local field is post collection and foreign is user collection
            {$lookup: {from:"users",localField: "author", foreignField: "_id", as:"authorDocument"}},

            //fields that resulting objects to have
            {$project: {
                title: 1,
                body: 1,
                createdDate: 1,

                //$authorDocument pulls the value of authorDocument
                //0 represents first element of the array which lookup is returning 
                author: {$arrayElemAt :["$authorDocument",0]}
            }}
        ]).toArray()

        //clean up author propperty in each post object
        posts= posts.map(function(post){
            post.author = {
                username: post.author.username,
                // so User model is required
                //.avatar is the property from User model
                avatar: new User(post.author,true).avatar
            }
            return post
        })


        if(posts.length){
            console.log(posts[0])
            resolve(posts[0])
            //returns first item of the array 
        }else{
            reject()
           
        }
    })
}
*/

Post.findByAuthorId = function(authorId){
    return Post.reusablePostQuery([
        {$match: {author:authorId}},
        //-1 for descedning order
        {$sort: {createdDate: -1}}
    ])
}

Post.delete=function(postIdToDelete,currentUserId){
    return new Promise(async(resolve,reject) => {
        try{
            let post= await Post.findSingleById(postIdToDelete,currentUserId)
        if(post.isVisitorOwner){
           await postsCollection.deleteOne({_id:new ObjectID(postIdToDelete)})
        resolve()
        }else{
            reject()
        }
        }catch{
            reject()
        }
    })
}

Post.search = function(searchTerm){
    return new Promise (async(resolve,reject)=> {
        // we should make sure that searchTerm is a string
        if(typeof(searchTerm)=="string"){
            let posts = await Post.reusablePostQuery([
                //since searching each and every fields is expensive , we put title and body in the index
                {$match: {$text: {$search: searchTerm}}},
                {$sort : {score:{$meta:"textScore"}}}//best match
            ])
           //resolve from posts from the database
            resolve(posts)
        }else{
            reject()
        }
    })
}

Post.countPostsByAuthor =  function(id){
    return new Promise(async (resolve,reject)=>{
        let postCount= await postsCollection.countDocuments({author: id})
        resolve(postCount)
    
    })

}

//to display posts of whom i have been following, on dashboard
Post.getFeed = async function(id){
    // create an array of the user ids that the current user follows
    let followedUsers = await followsCollection.find({authorId: new ObjectID(id)}).toArray()

        followedUsers = followedUsers.map(function(followDoc){
            return followDoc.followedId
        })
    //look for posts where the author is in the array of folowed users 
        return Post.reusablePostQuery([
            {$match: {author: {$in: followedUsers }}},
            {$sort: {createdDate: -1 }}
        ])
}

module.exports= Post