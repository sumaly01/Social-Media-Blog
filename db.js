//this file opens a connection to a mongodb database

const dotenv=require('dotenv')
//config is used to load all the package defined under .env
dotenv.config() 

const mongodb=require('mongodb')



mongodb.connect(process.env.CONNECTIONSTRING,{useNewUrlParser: true, useUnifiedTopology: true},function(err,client){
    // module.exports = client.db()
    module.exports = client/*esports mongodb client rather than database itself*/
    const app=require('./app')
   // app.listen(3000)
   app.listen(process.env.PORT)

})