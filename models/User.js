//bcrypt for hashing password
const bcrypt=require("bcryptjs")
const usersCollection=require('../db').db().collection("users")
const validator=require('validator')
//avatar is for photo
const md5=require('md5')


let User=function(data,getAvatar){
    this.data=data
    this.errors=[]
    if(getAvatar == undefined){ getAvatar = false}
    if(getAvatar){this.getAvatar()}
}

User.prototype.cleanUp=function(){
    if(typeof(this.data.username) != "string"){this.data.username=""}
    if(typeof(this.data.email) != "string"){this.data.email=""}
    if(typeof(this.data.password) != "string"){this.data.password=""}

    //get rid of any bogus properties
    this.data={
        username:this.data.username.trim().toLowerCase(),
        email:this.data.email.trim().toLowerCase(),
        password:this.data.password

    }
}

User.prototype.validate=function(){
    return new Promise( async (resolve,reject) => {
        if(this.data.username==""){this.errors.push("You must provide a username")}
        if(this.data.username!="" && !validator.isAlphanumeric(this.data.username)){this.errors.push("enter a valid username")}
        if(!validator.isEmail(this.data.email)){this.errors.push("You must provide a valid email.")}
        if(this.data.password==""){this.errors.push("You must provide a password")}
        if(this.data.password.length>0 && this.data.password.length<12){this.errors.push("pw must be atleast 12 letters")}
        if(this.data.password.length>50){this.errors.push("it should be less than 50")}
        if(this.data.username.length>0 && this.data.username.length<5){this.errors.push("username should be atleast 5")}
        if(this.data.username.length>10){this.errors.push("username should not exceed 10")}
    
    //only if username is valid then check to see if it is already taken
        if(this.data.username.length>2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)){
            let usernameExists= await usersCollection.findOne({username:this.data.username})
            if(usernameExists){this.errors.push("this username is already taken")}
        }
    
        //only ifemail is valid then check to see if it is already taken
        if(validator.isEmail(this.data.email)){
            let emailExists= await usersCollection.findOne({email:this.data.email})
            if(emailExists){this.errors.push("this email is already taken")}
        }
        resolve()
    })
}

User.prototype.login=function(){
   return new Promise((resolve,reject) => {
    this.cleanUp()
    // usersCollection.findOne({username:this.data.username},(err,attemptedUser) => {
    //   //arrow function is used so that THIS is not manipulated by global object
    //   if(attemptedUser && attemptedUser.password == this.data.password){
    //     resolve('congrats')
    // }else{
    //    reject('invalid')
    // }
    // }) 
     usersCollection.findOne({username:this.data.username}).then((attemptedUser) => {
        if(attemptedUser && bcrypt.compareSync(this.data.password,attemptedUser.password)){
           //email will also be same
            this.data = attemptedUser
            this.getAvatar()   
            resolve('congrats')
            }else{
               reject('invalid')
            }
    }).catch(function(){
        reject("please try again later")
    })
   })
}

User.prototype.register= function(){
    return new Promise(async (resolve,reject) => {
        //step number 1:VAlidate user data
        this.cleanUp()
       await this.validate()
    
        //step 2 : only if there are no validation errors
        //then save the user data into the datatbase
        if(!this.errors.length){
    
            //hash user password
            let salt=bcrypt.genSaltSync(10)
            this.data.password=bcrypt.hashSync(this.data.password,salt)
            
           await usersCollection.insertOne(this.data)
           //getAvatar is not stored in database because there might be changes
           this.getAvatar() 
           resolve()
        }else{
            reject(this.errors)
        }
    })
}

//for photo
User.prototype.getAvatar=function(){
    this.avatar =`https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}


//object oriented method is not used so no prototype
User.findByUsername = function(username){
    return new Promise(function(resolve,reject){
        if(typeof(username) != "string"){
            reject()
            //return stops the further execution
            return
        }
       usersCollection.findOne({username:username}).then(function(userDoc){
        if( userDoc){
            userDoc =new User(userDoc,true)
            userDoc={
                _id: userDoc.data._id,
                username: userDoc.data.username,
                avatar: userDoc.avatar
            }
            resolve(userDoc)
        }else{
            reject()
        }
       }).catch(function(){
           reject()
       })
    })
}

User.doesEmailExist = function(email){
    return new Promise(async function(resolve,reject) {
        if (typeof(email)!="string"){
            resolve(false)
            //stop the execution 
            return
        }
        let user = await usersCollection.findOne({email:email})
        if (user){
            resolve(true)
        }else{
            resolve(false)
        }
    })
}

module.exports=User