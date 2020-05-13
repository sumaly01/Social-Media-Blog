import axios from 'axios'

export default class RegistrationForm {
    constructor(){
        //on the basis of name ,not id nor class
        this._csrf = document.querySelector('[name="_csrf"]').value
        this.form = document.querySelector("#registration-form")
        //in home-guest ko registration-form ko bhitra ko elements lai point garcha i.e username,email,pw
        this.allFields = document.querySelectorAll("#registration-form .form-control")
        this.username = document.querySelector("#username-register")
        this.insertValidationElements()
        this.username.previousValue =""
        this.email = document.querySelector("#email-register")
        this.email.previousValue =""
        this.password = document.querySelector("#password-register")
        this.password.previousValue=""
        //only after axios req it will be true
        this.username.isUnique = false
        this.email.isUnique = false
        this.events() 
    }

    //events
    events(){
        this.form.addEventListener("submit",e => {
            e.preventDefault()//form does not submits by default
            this.formSubmitHandler()
        })

        //the function after keyup is used to check if the username field has changed wrt previous value
       this.username.addEventListener("keyup",()=> {
           //this.usernameHandler is a function as handler()
        this.isDifferent(this.username, this.usernameHandler)
       })

       this.email.addEventListener("keyup",()=> {
        //this.usernameHandler is a function as handler()
     this.isDifferent(this.email, this.emailHandler)
    })
    this.password.addEventListener("keyup",()=> {
        //this.usernameHandler is a function as handler()
     this.isDifferent(this.password, this.passwordHandler)
    })

    
        //the function after keyup is used to check if the username field has changed wrt previous value
        this.username.addEventListener("blur",()=> {
            //this.usernameHandler is a function as handler()
         this.isDifferent(this.username, this.usernameHandler)
        })
 
        this.email.addEventListener("blur",()=> {
         //this.usernameHandler is a function as handler()
      this.isDifferent(this.email, this.emailHandler)
     })
     this.password.addEventListener("blur",()=> {
         //this.usernameHandler is a function as handler()
      this.isDifferent(this.password, this.passwordHandler)
     })
    }

    //methods
    formSubmitHandler(){
        this.usernameImmediately()
        this.usernameAfterDelay()
        this.emailAfterDelay()
        this.passwordImmediately()
        this.passwordAfterDelay()

        //all perfect
        if(
            this.username.isUnique &&
            !this.username.errors &&
            this.email.isUnique &&
            !this.email.errors &&
            !this.password.errors
            ){
            this.form.submit()
        }
    }

    isDifferent(el,handler){
        if (el.previousValue != el.value){
            //this le tei particular obj lai point garna
            handler.call(this)
        }
        el.previousValue = el.value
    }

    usernameHandler(){
        this.username.errors= false
        this.usernameImmediately()
        clearTimeout(this.username.timer)
        this.username.timer= setTimeout(() => this.usernameAfterDelay(), 2000)
    }

    emailHandler(){
        this.email.errors= false
        clearTimeout(this.email.timer)
        this.email.timer= setTimeout(() => this.emailAfterDelay(), 2000)
    }

    
    passwordHandler(){
        this.password.errors= false
        this.passwordImmediately()
        clearTimeout(this.password.timer)
        this.password.timer= setTimeout(() => this.passwordAfterDelay(), 2000)
    }

    passwordImmediately(){
        if(this.password.value.length > 30 ){
            this.showValidationError(this.password,"Pw cannot be > 30")
        }
        if(!this.password.errors){
            this.hideValidationError(this.password)
        }
    }

    passwordAfterDelay(){
        if(this.password.value.length<12){
            this.showValidationError(this.password,"pw must be atleast 12")
        }
    }

    emailAfterDelay(){
        //req expression ie text + @ + text
        if(!/^\S+@\S+$/.test(this.email.value)){
            this.showValidationError(this.email,"You must provide a valid email")
        }

        if(!this.email.errors){
            axios.post('/doesEmailExist',{_csrf:this._csrf,email: this.email.value}).then((response)=>{
                //returns true or false from UserController
                if(response.data){
                    this.email.isUnique = false
                    this.showValidationError(this.email,"The email is alreayd used")
                }else{
                    this.email.isUnique = true
                    this.hideValidationError(this.email)
                }
            }).catch(()=>{
                console.log("Please try again later")
            })
        }
    }

    usernameImmediately () {
        //no need for validator package like in server side
        //regular expression
        if(this.username.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.username.value)){
            // alert("username can only contain letters and numbers")
       this.showValidationError(this.username,"Username can only contain letters and numbers")
        }

        if(this.username.value.length > 10){
            this.showValidationError(this.username,"username should be < 10")
        }

        if(!this.username.errors){
            this.hideValidationError(this.username)
        }
    }

    hideValidationError(el){
        el.nextElementSibling.classList.remove("liveValidateMessage--visible")
    }

    //check if the username is valid or not
    showValidationError(el,message){
        //red validation boxed from insertValidationElements()
        el.nextElementSibling.innerHTML = message
        el.nextElementSibling.classList.add("liveValidateMessage--visible")
        el.errors = true
    }

    usernameAfterDelay(){
      if(this.username.value.length < 3){
        this.showValidationError(this.username,"username must be atleast 3 characters")
      }

      //axios is used to see if the username is already taken or not 
      if(!this.username.errors){
          //send the url to doesUsernameExist and second parameter is object ot be sent to the does...
          //server will have the same url and SERVER will return a response of true or false on the base of username
        axios.post('/doesUsernameExist',{_csrf:this._csrf,username: this.username.value}).then((response)=> {
           //returns either true or false
            if (response.data){
                this.showValidationError(this.username,"The username is already taken")
                this.username.isUnique = false
            }else{
                //usernmae is available
                this.username.isUnique = true
            }
        }).catch(()=>{
            console.log("please try again later")
        })
      }
    }

    //this function is written first then above all ie from usernameHanlder()
    //pop as box of error
    insertValidationElements(){
        this.allFields.forEach(function(el){
            el.insertAdjacentHTML('afterend','<div class="alert alert-danger small liveValidateMessage"></div>')
        })
    }
}