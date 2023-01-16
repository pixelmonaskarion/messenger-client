import './App.css';
import api from "./Api.js";
import React from 'react';

class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = { loading: true };
	}
	componentDidMount() {
		let saved_state = {}
		if (localStorage.getItem('username') !== null) {
			saved_state = { ...saved_state, username: JSON.parse(localStorage.getItem('username')) };
		}
		if (localStorage.getItem('token') !== null) {
			saved_state = { ...saved_state, token: JSON.parse(localStorage.getItem('token')) };
		}
		if (localStorage.getItem('chats') !== null && localStorage.getItem('chats') !== "undefined") {
			saved_state = { ...saved_state, chats: JSON.parse(localStorage.getItem('chats')) };
		}
		if (localStorage.getItem('messages') !== null && localStorage.getItem('messages') !== "undefined") {
			saved_state = { ...saved_state, messages: JSON.parse(localStorage.getItem('messages')) };
		}
		let saved_screen = "chats";
		api.token_valid(saved_state.token).then((token_valid) => {
			if (!token_valid) {
				console.log("invalid token:", saved_state.token);
				saved_state = {};
				saved_screen = "sign in";
			} else {
				api.subscribeEvents(saved_state.token, (message) => this.onReceivedMessage(message));
			}
			this.setState({
				...saved_state,
				screen: saved_screen,
			}, () => {
				this.setState({ ...this.state, loading: false });
			});
		});
	}
	render() {
		if (this.state.loading === true) {
			return <header className="App-header">Loading...</header>
		}
		let content = null;
		if (this.state.screen === "chats") {
			content = <HomeScreen chatScreen={(chat) => this.chatScreen(chat)} newChat={() => this.newChat()} getChats={() => this.state.chats} getMessages={() => this.state.messages}></HomeScreen>;
		} else if (this.state.screen === "new chat") {
			content = <NewChatScreen homeScreen={() => this.homeScreen()} getUsername={() => { return this.state.username; }} chatScreen={(chat) => this.chatScreen(chat)}></NewChatScreen>
		} else if (this.state.screen === "sign in") {
			content = <SignInScreen setUser={(token, username, callback) => { this.setState({ ...this.state, token: token, username: username }, callback); }} homeScreen={() => this.homeScreen()} onReceivedMessage={(message) => this.onReceivedMessage(message)}></SignInScreen>;
		} else if (this.state.screen === "chat") {
			content = <ChatScreen homeScreen={() => this.homeScreen()} getChat={() => this.state.chats[String(this.state.active_chat)]} getToken={() => this.state.token} getMessages={() => this.state.messages} getUsername={() => this.state.username}></ChatScreen>
		}
		return (<div className="App">
			{content}
		</div>);
	}
	newChat() {
		this.setState({ ...this.state, screen: "new chat" });
	}

	homeScreen() {
		Notification.requestPermission().then((value) => {
			console.log(value);
		});
		this.setState({ ...this.state, screen: "chats" });
	}

	chatScreen(chat) {
		let chats_copy = { ...this.state.chats };
		chats_copy[String(chat.id)] = chat;
		let messages_copy = { ...this.state.messages };
		if (messages_copy[String(chat.id)] === undefined) {
			messages_copy[String(chat.id)] = [];
		}
		let new_state = { ...this.state, chats: chats_copy, active_chat: chat.id, messages: messages_copy };
		this.setState(new_state, () => {
			this.setState({ ...this.state, screen: "chat" });
		});
	}

	onReceivedMessage(message) {
		let message_object = JSON.parse(message).message;
		let finish = () => {
			api.received_message(this.state.token, message_object.id);
			if (this.state.chats[String(message_object.chat)] !== undefined) {
				let messages = this.state.messages;
				messages[String(message_object.chat)].push(message_object);
				this.setState({ ...this.state, messages: messages });
			} else {
				api.get_chat(message_object.chat, this.state.token).then((chat) => {
					let chats_copy = { ...this.state.chats };
					chats_copy[String(chat.id)] = chat;
					let messages_copy = { ...this.state.messages };
					if (messages_copy[String(chat.id)] === undefined) {
						messages_copy[String(chat.id)] = [];
					}
					messages_copy[String(chat.id)].push(message_object);
					let new_state = { ...this.state, chats: chats_copy, active_chat: chat.id, messages: messages_copy };
					this.setState(new_state);
				});
			}
		};
		if (this.state.chats === undefined) {
			this.setState({ ...this.state, chats: [] }, finish);
		} else {
			finish();
		}
	}

	componentDidUpdate() {
		if (this.state.loading === false && this.state.screen !== "sign in") {
			localStorage.setItem("username", JSON.stringify(this.state.username));
			localStorage.setItem("token", JSON.stringify(this.state.token));
			localStorage.setItem("chats", JSON.stringify(this.state.chats));
			localStorage.setItem("messages", JSON.stringify(this.state.messages));
		}
	}
}

class HomeScreen extends React.Component {
	render() {
		let chats = [];
		if (this.props.getChats() !== undefined) {
			for (var i = 0; i < Object.values(this.props.getChats()).length; i++) {
				chats.push(<ChatPreview key={JSON.stringify(Object.values(this.props.getChats())[i])} chat={Object.values(this.props.getChats())[i]} messages={this.props.getMessages()[String(Object.values(this.props.getChats())[i].id)]} chatScreen={this.props.chatScreen}></ChatPreview>);
			}
		}
		return (<div>
			<NewChatButton onClick={() => { this.props.newChat() }}></NewChatButton>
			{chats}
		</div>);
	}
}

class ChatPreview extends React.Component {
	render() {
		let message_preview = null;
		if (this.props.messages[this.props.messages.length - 1] !== undefined) {
			message_preview = <p className='MessagePreviewBody'>{this.props.messages[this.props.messages.length - 1].from_user.username}: {this.props.messages[this.props.messages.length - 1].text}</p>;
		}
		return (<div onClick={() => (this.props.chatScreen(this.props.chat))}>
			<h1 className="MessagePreview">{this.props.chat.name}</h1>
			{message_preview}
		</div>);
	}
}

class ChatScreen extends React.Component {
	render() {
		let messages = [];
		for (var i = 0; i < this.props.getMessages()[String(this.props.getChat().id)].length; i++) {
			let message = this.props.getMessages()[String(this.props.getChat().id)][i];
			messages.push(<Message key={JSON.stringify(message)} message={message} getUsername={this.props.getUsername}></Message>)
		}
		return (<div>
			<h1>{this.props.getChat().name}</h1>
			<div className='AllMessages' id="allMessages">{messages}</div>
			<MessageBox getToken={this.props.getToken} getChat={this.props.getChat}></MessageBox>
			<BackArrow onClick={() => this.props.homeScreen()}></BackArrow>
		</div>);
	}
}

class Message extends React.Component {
	render() {
		let from_me = null;
		let username = this.props.message.from_user.username;
		if (this.props.message.from_user.username === this.props.getUsername()) {
			from_me = "Me";
			username = "Me";
		} else {
			from_me = "Other";
		}
		return (<div className={'Message'+from_me}>
			<p>{username + ": " + this.props.message.text}</p>
			
		</div>);
	}
}

class MessageBox extends React.Component {
	render() {
		return (<div>
			<input className='MessageBoxInput' placeholder="Send Message" id="SendMessageText" onKeyDown={(event) => {input_keypressed(event, () => {this.sendMessage()})}}></input><button className='SendMessageButton' onClick={() => this.sendMessage()}>Send</button>
		</div>);
	}

	sendMessage() {
		let message_text = document.getElementById("SendMessageText").value;
		if (message_text === "") {
			return;
		}
		document.getElementById("SendMessageText").value = "";
		let token = this.props.getToken();
		api.send_message(message_text, token, this.props.getChat().id);
	}
}

class SignInScreen extends React.Component {
	constructor(props) {
		super(props);
		this.state = { error: null };
	}
	render() {
		return (<div className='Log In'>
			<h1>Log In</h1>
			<p>Username: <input type="text" className='StyledInput' id="login_username"></input></p>
			<p>Password: <input type="text" className='StyledInput' id="login_password"></input></p>
			<p>Display Name: <input type="text" className='StyledInput' id="login_display_name"></input></p>
			<p className='ErrorText'>{this.state.error}</p>
			<button className='StyledButton' onClick={() => this.login()}>Log in</button>
		</div>);
	}
	login() {
		let username = document.getElementById("login_username").value;
		let display_name = document.getElementById("login_display_name").value;
		let password = document.getElementById("login_password").value;
		if (username.length === 0) {
			this.setState({ ...this.state, error: "Username is empty" });
			return;
		}
		if (password.length === 0) {
			this.setState({ ...this.state, error: "Password is empty" });
			return;
		}
		if (display_name.length === 0) {
			this.setState({ ...this.state, error: "Display name is empty" });
			return;
		}
		api.login(username, password).then((json) => {
			if (json["server"] !== undefined) {
				if (json["server"] === "incorrect password") {
					this.setState({ ...this.state, error: "Incorrect password" });
				} else {
					this.setState({ ...this.state, error: "An unknown error occured" });
				}
			} else {
				this.props.setUser(json.token, username, () => {
					api.set_user_profile(json.token, display_name);
					api.subscribeEvents(json.token, this.props.onReceivedMessage);
					this.props.homeScreen();
				});
				
			}
		});
	}
}

class NewChatScreen extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			error: null
		};
	}
	render() {
		return <div>
			<input type="text" className='StyledInput' defaultValue="New Chat" id="newChatChatName"></input>
			<NewChatMembers setError={(error) => this.setState({ ...this.state, error: error })} create_chat={(members) => this.create_chat(members)} getUsername={this.props.getUsername}></NewChatMembers>

			<BackArrow onClick={() => this.props.homeScreen()}></BackArrow>
		</div>;
	}

	create_chat(members) {
		let chatName = document.getElementById("newChatChatName").value;
		members.push({ username: this.props.getUsername() });
		api.create_chat(chatName, members).then((chat) => {
			this.props.chatScreen(chat);
		});
	}
}

class NewChatButton extends React.Component {
	render() {
		return (<div className="NewChatButton" onClick={this.props.onClick}>
			<p className="noselect">NC</p>
		</div>);
	}
}

class BackArrow extends React.Component {
	render() {
		return (<div className="SquareButton" onClick={this.props.onClick}>
			<p className="noselect">Back</p>
		</div>);
	}
}

class NewChatMembers extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			members: [],
			error: null,
		};
	}
	render() {
		let members_list_div = [];
		for (var i = 0; i < this.state.members.length; i++) {
			members_list_div.push(<p key={this.state.members[i].username}>{this.state.members[i].name + " (" + this.state.members[i].username + ")"}</p>);
		}
		return (<div>
			{members_list_div}
			<p className='New-chat-add-member'>Add Member: <input type="text" id="newChatMemberInput" className='StyledInput' onInput={(val) => {this.update_user_search(val); input_keypressed(val)}} onKeyDown={(event) => input_keypressed(event, () => {this.add_member(event.target.value);})}></input><button className='StyledButton' onClick={() => this.add_member(document.getElementById("newChatMemberInput").value)}>Add</button></p>
			<button className='StyledButton' onClick={() => this.props.create_chat(this.state.members)}>Create</button>
			<p className='ErrorText'>{this.state.error}</p>
		</div>);
	}
	add_member(member) {
		if (member === "") {
			this.setState({ ...this.state, error: "User is empty" });
			return;
		}
		if (member === this.props.username) {
			this.setState({ ...this.state, error: "You will automatically be in this chat" });
			return;
		}
		api.get_user(member).then((json) => {
			if (json.server !== "no user") {
				let in_members = false;
				for (var i = 0; i < this.state.members.length; i++) {
					if (this.state.members[i].username === json.username) {
						in_members = true;
					}
				}
				if (!in_members) {
					let members = this.state.members;
					members.push(json);
					this.setState({ ...this.state, members: members });
					this.setState({ ...this.state, error: "" });
				}
			} else {
				this.setState({ ...this.state, error: "That user does not exist" });
			}
		})
	}
	update_user_search(input) {

	}
}

function input_keypressed(event, callback) {
	if (event.key === "Enter") {
		event.preventDefault();
		callback();
	}
};

export default App;
