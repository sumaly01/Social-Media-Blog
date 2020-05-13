import DOMPurify from 'dompurify'

export default class Chat {
    constructor() {
      this.openedYet = false
      this.chatWrapper = document.querySelector("#chat-wrapper")
      this.openIcon = document.querySelector(".header-chat-icon")
      this.injectHTML()
      this.chatLog = document.querySelector("#chat")
      this.chatField = document.querySelector("#chatField")
      this.chatForm = document.querySelector("#chatForm")
      this.closeIcon = document.querySelector(".chat-title-bar-close")
      this.events()
    }

    //events
    events() {
        //e is event
        this.chatForm.addEventListener("submit", (e) => {
          e.preventDefault()// i.e. it wnt reload
          this.sendMessageToServer()
        })
        this.openIcon.addEventListener("click", () => this.showChat())
        this.closeIcon.addEventListener("click", () => this.hideChat())
      }


    //methods
    sendMessageToServer() {
        //emits data to server
        //'chatMessageFromBrowser is an event
        this.socket.emit('chatMessageFromBrowser', {message: this.chatField.value})
        this.chatLog.insertAdjacentHTML('beforeend', DOMPurify.sanitize(`
        <div class="chat-self">
            <div class="chat-message">
              <div class="chat-message-inner">
                ${this.chatField.value}
              </div>
            </div>
            <img class="chat-avatar avatar-tiny" src="${this.avatar}">
          </div>
        `))
        this.chatLog.scrollTop = this.chatLog.scrollHeight
        this.chatField.value = ''
        this.chatField.focus()
      }

      hideChat() {
        this.chatWrapper.classList.remove("chat--visible")
      }


    showChat() {
        if (!this.openedYet) {
          this.openConnection()
        }
           //only for the first time openedYet will be true
        this.openedYet = true
        this.chatWrapper.classList.add("chat--visible")
        this.chatField.focus()
      }

     openConnection() {
         //js file in the footer is going to make this func available within the globlebrowser scope
       //io() creates connection between browser and server
       //socket connection is stored in this.socket
        this.socket = io()
        this.socket.on('welcome', data => {
              //storing in memory
          this.username = data.username
          this.avatar = data.avatar
        })
        this.socket.on('chatMessageFromServer', (data) => {
             // alert(data.message)
          this.displayMessageFromServer(data)
        })
      }

      displayMessageFromServer(data) {
        this.chatLog.insertAdjacentHTML('beforeend', DOMPurify.sanitize(`
        <div class="chat-other">
            <a href="/profile/${data.username}"><img class="avatar-tiny" src="${data.avatar}"></a>
            <div class="chat-message"><div class="chat-message-inner">
              <a href="/profile/${data.username}"><strong>${data.username}:</strong></a>
              ${data.message}
            </div></div>
          </div>
        `))
        this.chatLog.scrollTop = this.chatLog.scrollHeight
      }

   

      injectHTML() {
        this.chatWrapper.innerHTML = `
        <div class="chat-title-bar">Chat <span class="chat-title-bar-close"><i class="fas fa-times-circle"></i></span></div>
        <div id="chat" class="chat-log"></div>
        
        <form id="chatForm" class="chat-form border-top">
          <input type="text" class="chat-field" id="chatField" placeholder="Type a message…" autocomplete="off">
        </form>
        `
      }
    }